CREATE TABLE "catalog_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"predecessor_order_id" uuid,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_grants_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "catalog_grants_window_check" CHECK ("valid_until" > "valid_from")
);
--> statement-breakpoint

CREATE TABLE "catalog_grant_revocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revocation_reason" text NOT NULL,
	"revoked_by" uuid,
	CONSTRAINT "catalog_grant_revocations_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint

ALTER TABLE "catalog_grants" ADD CONSTRAINT "catalog_grants_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_grants" ADD CONSTRAINT "catalog_grants_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_grants" ADD CONSTRAINT "catalog_grants_predecessor_order_id_orders_id_fk" FOREIGN KEY ("predecessor_order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "catalog_grant_revocations" ADD CONSTRAINT "catalog_grant_revocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_grant_revocations" ADD CONSTRAINT "catalog_grant_revocations_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "catalog_grants_entitlement_window_idx" ON "catalog_grants" USING btree ("entitlement_id", "valid_until");--> statement-breakpoint
CREATE INDEX "catalog_grants_predecessor_order_id_idx" ON "catalog_grants" USING btree ("predecessor_order_id");--> statement-breakpoint

-- Trigger 1: Immutability guard for catalog_grants
CREATE OR REPLACE FUNCTION phase4_guard_catalog_grant_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'Catalog grants are immutable; mutation or deletion is forbidden on catalog_grants (id: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_catalog_grant_mutation
BEFORE UPDATE OR DELETE
ON catalog_grants
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_catalog_grant_mutation();
--> statement-breakpoint

-- Trigger 2: Immutability guard for catalog_grant_revocations
CREATE OR REPLACE FUNCTION phase4_guard_catalog_revocation_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'Catalog grant revocations are immutable; mutation or deletion is forbidden on catalog_grant_revocations (id: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_catalog_revocation_mutation
BEFORE UPDATE OR DELETE
ON catalog_grant_revocations
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_catalog_revocation_mutation();
--> statement-breakpoint

-- Trigger 3: Immutability guard for entitlement_order_effects
CREATE OR REPLACE FUNCTION phase4_guard_order_effect_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'Entitlement order effects are immutable; mutation or deletion is forbidden on entitlement_order_effects (id: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_order_effect_mutation
BEFORE UPDATE OR DELETE
ON entitlement_order_effects
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_order_effect_mutation();
--> statement-breakpoint

-- Trigger 4: Bidirectional consistency between catalog_grants and entitlement_order_effects
CREATE OR REPLACE FUNCTION phase4_validate_grant_effect_consistency()
RETURNS TRIGGER AS $$
DECLARE
	v_effect_expires timestamptz;
	v_grant_until timestamptz;
	v_order_customer_id uuid;
	v_entitlement_customer_id uuid;
BEGIN
	IF TG_TABLE_NAME = 'catalog_grants' THEN
		SELECT expires_at_after INTO v_effect_expires
		FROM entitlement_order_effects
		WHERE order_id = NEW.order_id;

		IF v_effect_expires IS NULL THEN
			RAISE EXCEPTION 'Grant % references order % with missing order effect', NEW.id, NEW.order_id;
		END IF;

		IF abs(extract(epoch from (v_effect_expires - NEW.valid_until))) >= 1.0 THEN
			RAISE EXCEPTION 'Inconsistent ledger: grant valid_until (%) does not match effect expires_at_after (%) for order %',
				NEW.valid_until, v_effect_expires, NEW.order_id;
		END IF;

		SELECT customer_id INTO v_order_customer_id FROM orders WHERE id = NEW.order_id;
		SELECT customer_id INTO v_entitlement_customer_id FROM entitlements WHERE id = NEW.entitlement_id;

		IF v_order_customer_id IS DISTINCT FROM v_entitlement_customer_id THEN
			RAISE EXCEPTION 'Customer alignment violation: order customer % does not match entitlement customer %',
				v_order_customer_id, v_entitlement_customer_id;
		END IF;

	ELSIF TG_TABLE_NAME = 'entitlement_order_effects' THEN
		IF EXISTS (SELECT 1 FROM orders WHERE id = NEW.order_id AND target_kind = 'CATALOG') THEN
			SELECT valid_until INTO v_grant_until
			FROM catalog_grants
			WHERE order_id = NEW.order_id;

			IF v_grant_until IS NULL THEN
				RAISE EXCEPTION 'CATALOG order effect % references order % with missing catalog grant', NEW.id, NEW.order_id;
			END IF;

			IF abs(extract(epoch from (v_grant_until - NEW.expires_at_after))) >= 1.0 THEN
				RAISE EXCEPTION 'Inconsistent ledger: effect expires_at_after (%) does not match grant valid_until (%) for order %',
					NEW.expires_at_after, v_grant_until, NEW.order_id;
			END IF;
		END IF;
	END IF;

	RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_grant_effect_consistency_on_grants
AFTER INSERT OR UPDATE ON catalog_grants
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION phase4_validate_grant_effect_consistency();
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_grant_effect_consistency_on_effects
AFTER INSERT OR UPDATE ON entitlement_order_effects
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION phase4_validate_grant_effect_consistency();
