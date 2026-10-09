-- Function 1: Validate commercial target type and hierarchy on offers, orders, and entitlements
CREATE OR REPLACE FUNCTION phase4_validate_commercial_target()
RETURNS TRIGGER AS $$
DECLARE
	v_content_type "content_type";
	v_series_content_type "content_type";
	v_season_series_id uuid;
	v_episode_season_id uuid;
BEGIN
	IF NEW.target_kind = 'MOVIE' THEN
		SELECT content_type INTO v_content_type FROM content WHERE id = NEW.target_movie_content_id;
		IF v_content_type IS NULL OR v_content_type <> 'movie' THEN
			RAISE EXCEPTION 'Invalid commercial target: MOVIE target % must reference content with content_type movie', NEW.target_movie_content_id;
		END IF;
	ELSIF NEW.target_kind = 'SERIES' THEN
		SELECT content_type INTO v_content_type FROM content WHERE id = NEW.target_series_content_id;
		IF v_content_type IS NULL OR v_content_type <> 'series' THEN
			RAISE EXCEPTION 'Invalid commercial target: SERIES target % must reference content with content_type series', NEW.target_series_content_id;
		END IF;
	ELSIF NEW.target_kind = 'SEASON' THEN
		SELECT series_id INTO v_season_series_id FROM seasons WHERE id = NEW.target_season_id;
		IF v_season_series_id IS NULL THEN
			RAISE EXCEPTION 'Invalid commercial target: SEASON target % does not exist', NEW.target_season_id;
		END IF;
		SELECT content_type INTO v_series_content_type FROM content WHERE id = v_season_series_id;
		IF v_series_content_type IS NULL OR v_series_content_type <> 'series' THEN
			RAISE EXCEPTION 'Invalid commercial target: SEASON % references series % without content_type series', NEW.target_season_id, v_season_series_id;
		END IF;
	ELSIF NEW.target_kind = 'EPISODE' THEN
		SELECT season_id INTO v_episode_season_id FROM episodes WHERE id = NEW.target_episode_id;
		IF v_episode_season_id IS NULL THEN
			RAISE EXCEPTION 'Invalid commercial target: EPISODE target % does not exist', NEW.target_episode_id;
		END IF;
		SELECT series_id INTO v_season_series_id FROM seasons WHERE id = v_episode_season_id;
		IF v_season_series_id IS NULL THEN
			RAISE EXCEPTION 'Invalid commercial target: EPISODE % references season % which does not exist', NEW.target_episode_id, v_episode_season_id;
		END IF;
		SELECT content_type INTO v_series_content_type FROM content WHERE id = v_season_series_id;
		IF v_series_content_type IS NULL OR v_series_content_type <> 'series' THEN
			RAISE EXCEPTION 'Invalid commercial target: EPISODE % references series % without content_type series', NEW.target_episode_id, v_season_series_id;
		END IF;
	ELSIF NEW.target_kind = 'CATALOG' THEN
		IF NEW.target_movie_content_id IS NOT NULL OR
		   NEW.target_series_content_id IS NOT NULL OR
		   NEW.target_season_id IS NOT NULL OR
		   NEW.target_episode_id IS NOT NULL THEN
			RAISE EXCEPTION 'Invalid commercial target: CATALOG target must have all typed targets NULL';
		END IF;
	ELSE
		RAISE EXCEPTION 'Unknown target_kind: %', NEW.target_kind;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_validate_offers_commercial_target
BEFORE INSERT OR UPDATE OF target_kind, target_movie_content_id, target_series_content_id, target_season_id, target_episode_id
ON offers
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_commercial_target();
--> statement-breakpoint

CREATE TRIGGER phase4_trg_validate_orders_commercial_target
BEFORE INSERT OR UPDATE OF target_kind, target_movie_content_id, target_series_content_id, target_season_id, target_episode_id
ON orders
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_commercial_target();
--> statement-breakpoint

CREATE TRIGGER phase4_trg_validate_entitlements_commercial_target
BEFORE INSERT OR UPDATE OF target_kind, target_movie_content_id, target_series_content_id, target_season_id, target_episode_id
ON entitlements
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_commercial_target();
--> statement-breakpoint

-- Function 2: Guard commercial target hierarchy changes on catalog tables
CREATE OR REPLACE FUNCTION phase4_guard_commercial_target_hierarchy_change()
RETURNS TRIGGER AS $$
BEGIN
	IF TG_TABLE_NAME = 'content' THEN
		IF OLD.content_type IS DISTINCT FROM NEW.content_type THEN
			IF OLD.content_type = 'movie' THEN
				IF EXISTS (SELECT 1 FROM offers WHERE target_movie_content_id = OLD.id) OR
				   EXISTS (SELECT 1 FROM orders WHERE target_movie_content_id = OLD.id) OR
				   EXISTS (SELECT 1 FROM entitlements WHERE target_movie_content_id = OLD.id) THEN
					RAISE EXCEPTION 'Cannot change content_type for content %: referenced by commercial movie records', OLD.id;
				END IF;
			ELSIF OLD.content_type = 'series' THEN
				IF EXISTS (SELECT 1 FROM offers WHERE target_series_content_id = OLD.id) OR
				   EXISTS (SELECT 1 FROM orders WHERE target_series_content_id = OLD.id) OR
				   EXISTS (SELECT 1 FROM entitlements WHERE target_series_content_id = OLD.id) OR
				   EXISTS (
				       SELECT 1 FROM seasons s
				       JOIN offers o ON o.target_season_id = s.id
				       WHERE s.series_id = OLD.id
				   ) OR
				   EXISTS (
				       SELECT 1 FROM seasons s
				       JOIN orders ord ON ord.target_season_id = s.id
				       WHERE s.series_id = OLD.id
				   ) OR
				   EXISTS (
				       SELECT 1 FROM seasons s
				       JOIN entitlements ent ON ent.target_season_id = s.id
				       WHERE s.series_id = OLD.id
				   ) OR
				   EXISTS (
				       SELECT 1 FROM episodes ep
				       JOIN seasons s ON s.id = ep.season_id
				       JOIN offers o ON o.target_episode_id = ep.id
				       WHERE s.series_id = OLD.id
				   ) OR
				   EXISTS (
				       SELECT 1 FROM episodes ep
				       JOIN seasons s ON s.id = ep.season_id
				       JOIN orders ord ON ord.target_episode_id = ep.id
				       WHERE s.series_id = OLD.id
				   ) OR
				   EXISTS (
				       SELECT 1 FROM episodes ep
				       JOIN seasons s ON s.id = ep.season_id
				       JOIN entitlements ent ON ent.target_episode_id = ep.id
				       WHERE s.series_id = OLD.id
				   ) THEN
					RAISE EXCEPTION 'Cannot change content_type for content %: referenced by commercial series/season/episode records', OLD.id;
				END IF;
			END IF;
		END IF;
	ELSIF TG_TABLE_NAME = 'seasons' THEN
		IF OLD.series_id IS DISTINCT FROM NEW.series_id THEN
			IF EXISTS (SELECT 1 FROM offers WHERE target_season_id = OLD.id) OR
			   EXISTS (SELECT 1 FROM orders WHERE target_season_id = OLD.id) OR
			   EXISTS (SELECT 1 FROM entitlements WHERE target_season_id = OLD.id) OR
			   EXISTS (
			       SELECT 1 FROM episodes ep
			       JOIN offers o ON o.target_episode_id = ep.id
			       WHERE ep.season_id = OLD.id
			   ) OR
			   EXISTS (
			       SELECT 1 FROM episodes ep
			       JOIN orders ord ON ord.target_episode_id = ep.id
			       WHERE ep.season_id = OLD.id
			   ) OR
			   EXISTS (
			       SELECT 1 FROM episodes ep
			       JOIN entitlements ent ON ent.target_episode_id = ep.id
			       WHERE ep.season_id = OLD.id
			   ) THEN
				RAISE EXCEPTION 'Cannot change series_id for season %: referenced by commercial season/episode records', OLD.id;
			END IF;
		END IF;
	ELSIF TG_TABLE_NAME = 'episodes' THEN
		IF OLD.season_id IS DISTINCT FROM NEW.season_id THEN
			IF EXISTS (SELECT 1 FROM offers WHERE target_episode_id = OLD.id) OR
			   EXISTS (SELECT 1 FROM orders WHERE target_episode_id = OLD.id) OR
			   EXISTS (SELECT 1 FROM entitlements WHERE target_episode_id = OLD.id) THEN
				RAISE EXCEPTION 'Cannot change season_id for episode %: referenced by commercial episode records', OLD.id;
			END IF;
		END IF;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_content_type_change
BEFORE UPDATE OF content_type
ON content
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_commercial_target_hierarchy_change();
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_season_hierarchy_change
BEFORE UPDATE OF series_id
ON seasons
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_commercial_target_hierarchy_change();
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_episode_hierarchy_change
BEFORE UPDATE OF season_id
ON episodes
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_commercial_target_hierarchy_change();
--> statement-breakpoint

-- Function 3: Validate offer policy membership cardinality and scope (deferred constraint trigger)
CREATE OR REPLACE FUNCTION phase4_validate_offer_policy_membership()
RETURNS TRIGGER AS $$
DECLARE
	v_offer_id uuid;
	v_target_kind "commercial_target_kind";
	v_policy_type "commercial_policy_type";
	v_cat_count integer;
	v_cnt_count integer;
BEGIN
	IF TG_OP = 'DELETE' THEN
		v_offer_id := OLD.offer_id;
	ELSE
		IF TG_TABLE_NAME = 'offers' THEN
			v_offer_id := NEW.id;
		ELSE
			v_offer_id := NEW.offer_id;
		END IF;
	END IF;

	SELECT target_kind, catalog_policy_type INTO v_target_kind, v_policy_type
	FROM offers
	WHERE id = v_offer_id;

	-- If offer was deleted in this transaction, exit
	IF NOT FOUND THEN
		RETURN NULL;
	END IF;

	SELECT COUNT(*) INTO v_cat_count FROM offer_catalog_policy_category_members WHERE offer_id = v_offer_id;
	SELECT COUNT(*) INTO v_cnt_count FROM offer_catalog_policy_content_members WHERE offer_id = v_offer_id;

	IF v_target_kind <> 'CATALOG' THEN
		IF v_cat_count > 0 OR v_cnt_count > 0 THEN
			RAISE EXCEPTION 'Non-CATALOG offer % must not have catalog policy members', v_offer_id;
		END IF;
		IF v_policy_type IS NOT NULL THEN
			RAISE EXCEPTION 'Non-CATALOG offer % must have null catalog_policy_type', v_offer_id;
		END IF;
	ELSE
		IF v_policy_type IS NULL THEN
			RAISE EXCEPTION 'CATALOG offer % must specify catalog_policy_type', v_offer_id;
		ELSIF v_policy_type = 'ALL_CATALOG' THEN
			IF v_cat_count > 0 OR v_cnt_count > 0 THEN
				RAISE EXCEPTION 'ALL_CATALOG offer % must have zero category and content members', v_offer_id;
			END IF;
		ELSIF v_policy_type = 'CATEGORY_SET' THEN
			IF v_cat_count = 0 THEN
				RAISE EXCEPTION 'CATEGORY_SET offer % must have at least one category member', v_offer_id;
			END IF;
			IF v_cnt_count > 0 THEN
				RAISE EXCEPTION 'CATEGORY_SET offer % must have zero explicit content members', v_offer_id;
			END IF;
		ELSIF v_policy_type = 'CONTENT_SET' THEN
			IF v_cnt_count = 0 THEN
				RAISE EXCEPTION 'CONTENT_SET offer % must have at least one content member', v_offer_id;
			END IF;
			IF v_cat_count > 0 THEN
				RAISE EXCEPTION 'CONTENT_SET offer % must have zero category members', v_offer_id;
			END IF;
		END IF;
	END IF;

	RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_offer_policy_on_offers
AFTER INSERT OR UPDATE OF target_kind, catalog_policy_type
ON offers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_offer_policy_membership();
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_offer_policy_on_cat_members
AFTER INSERT OR UPDATE OR DELETE
ON offer_catalog_policy_category_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_offer_policy_membership();
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_offer_policy_on_cnt_members
AFTER INSERT OR UPDATE OR DELETE
ON offer_catalog_policy_content_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_offer_policy_membership();
--> statement-breakpoint

-- Function 4: Validate snapshot ownership and cardinality (deferred constraint trigger)
CREATE OR REPLACE FUNCTION phase4_validate_snapshot_ownership_and_cardinality()
RETURNS TRIGGER AS $$
DECLARE
	v_snapshot_id uuid;
	v_order_count integer;
	v_order_target_kind "commercial_target_kind";
	v_order_offer_id uuid;
	v_offer_policy_type "commercial_policy_type";
	v_snapshot_policy_type "commercial_policy_type";
	v_cat_count integer;
	v_cnt_count integer;
BEGIN
	IF TG_OP = 'DELETE' THEN
		v_snapshot_id := OLD.snapshot_id;
	ELSE
		IF TG_TABLE_NAME = 'commercial_policy_snapshots' THEN
			v_snapshot_id := NEW.id;
		ELSIF TG_TABLE_NAME = 'orders' THEN
			v_snapshot_id := NEW.catalog_policy_snapshot_id;
			IF v_snapshot_id IS NULL THEN
				IF NEW.target_kind = 'CATALOG' THEN
					RAISE EXCEPTION 'CATALOG order % must reference a commercial policy snapshot', NEW.id;
				END IF;
				RETURN NULL;
			END IF;
		ELSE
			v_snapshot_id := NEW.snapshot_id;
		END IF;
	END IF;

	SELECT policy_type INTO v_snapshot_policy_type
	FROM commercial_policy_snapshots
	WHERE id = v_snapshot_id;

	-- If snapshot was deleted, exit
	IF NOT FOUND THEN
		RETURN NULL;
	END IF;

	SELECT COUNT(*)
	INTO v_order_count
	FROM orders
	WHERE catalog_policy_snapshot_id = v_snapshot_id;

	IF v_order_count <> 1 THEN
		RAISE EXCEPTION 'Snapshot % must be referenced by exactly one order (found %)', v_snapshot_id, v_order_count;
	END IF;

	SELECT target_kind, offer_id
	INTO v_order_target_kind, v_order_offer_id
	FROM orders
	WHERE catalog_policy_snapshot_id = v_snapshot_id
	LIMIT 1;

	IF v_order_target_kind <> 'CATALOG' THEN
		RAISE EXCEPTION 'Order referencing snapshot % must have target_kind CATALOG', v_snapshot_id;
	END IF;

	SELECT catalog_policy_type INTO v_offer_policy_type
	FROM offers
	WHERE id = v_order_offer_id;

	IF v_snapshot_policy_type IS DISTINCT FROM v_offer_policy_type THEN
		RAISE EXCEPTION 'Snapshot % policy_type % does not match source offer % policy_type %',
			v_snapshot_id, v_snapshot_policy_type, v_order_offer_id, v_offer_policy_type;
	END IF;

	SELECT COUNT(*) INTO v_cat_count FROM commercial_policy_snapshot_categories WHERE snapshot_id = v_snapshot_id;
	SELECT COUNT(*) INTO v_cnt_count FROM commercial_policy_snapshot_contents WHERE snapshot_id = v_snapshot_id;

	IF v_snapshot_policy_type = 'ALL_CATALOG' THEN
		IF v_cat_count > 0 OR v_cnt_count > 0 THEN
			RAISE EXCEPTION 'ALL_CATALOG snapshot % must have zero category and content members', v_snapshot_id;
		END IF;
	ELSIF v_snapshot_policy_type = 'CATEGORY_SET' THEN
		IF v_cat_count = 0 THEN
			RAISE EXCEPTION 'CATEGORY_SET snapshot % must have at least one category member', v_snapshot_id;
		END IF;
	ELSIF v_snapshot_policy_type = 'CONTENT_SET' THEN
		IF v_cnt_count = 0 THEN
			RAISE EXCEPTION 'CONTENT_SET snapshot % must have at least one content member', v_snapshot_id;
		END IF;
		IF v_cat_count > 0 THEN
			RAISE EXCEPTION 'CONTENT_SET snapshot % must have zero category members', v_snapshot_id;
		END IF;
	END IF;

	RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_snapshot_on_snapshots
AFTER INSERT OR UPDATE
ON commercial_policy_snapshots
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_snapshot_ownership_and_cardinality();
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_snapshot_on_orders
AFTER INSERT OR UPDATE OF catalog_policy_snapshot_id, target_kind, offer_id
ON orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_snapshot_ownership_and_cardinality();
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_snapshot_on_cat_members
AFTER INSERT OR UPDATE OR DELETE
ON commercial_policy_snapshot_categories
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_snapshot_ownership_and_cardinality();
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER phase4_trg_check_snapshot_on_cnt_members
AFTER INSERT OR UPDATE OR DELETE
ON commercial_policy_snapshot_contents
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION phase4_validate_snapshot_ownership_and_cardinality();
--> statement-breakpoint

-- Function 5: Immutability guard for plan_versions
CREATE OR REPLACE FUNCTION phase4_guard_plan_version_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'Plan versions are immutable; mutations or deletions are forbidden on plan_versions (id: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_plan_version_mutation
BEFORE UPDATE OR DELETE
ON plan_versions
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_plan_version_mutation();
--> statement-breakpoint

-- Function 6: Immutability guard for commercial policy snapshots and snapshot members
CREATE OR REPLACE FUNCTION phase4_guard_commercial_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'Commercial policy snapshots and snapshot members are immutable; mutation or deletion is forbidden';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_snapshot_mutation
BEFORE UPDATE OR DELETE
ON commercial_policy_snapshots
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_commercial_snapshot_mutation();
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_snapshot_categories_mutation
BEFORE UPDATE OR DELETE
ON commercial_policy_snapshot_categories
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_commercial_snapshot_mutation();
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_snapshot_contents_mutation
BEFORE UPDATE OR DELETE
ON commercial_policy_snapshot_contents
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_commercial_snapshot_mutation();
--> statement-breakpoint

-- Function 7: Immutability guard for purchased order terms
CREATE OR REPLACE FUNCTION phase4_guard_order_purchase_terms()
RETURNS TRIGGER AS $$
BEGIN
	IF OLD.customer_id IS DISTINCT FROM NEW.customer_id OR
	   OLD.offer_id IS DISTINCT FROM NEW.offer_id OR
	   OLD.target_kind IS DISTINCT FROM NEW.target_kind OR
	   OLD.target_movie_content_id IS DISTINCT FROM NEW.target_movie_content_id OR
	   OLD.target_series_content_id IS DISTINCT FROM NEW.target_series_content_id OR
	   OLD.target_season_id IS DISTINCT FROM NEW.target_season_id OR
	   OLD.target_episode_id IS DISTINCT FROM NEW.target_episode_id OR
	   OLD.plan_version_id IS DISTINCT FROM NEW.plan_version_id OR
	   OLD.amount_tzs IS DISTINCT FROM NEW.amount_tzs OR
	   OLD.duration_value IS DISTINCT FROM NEW.duration_value OR
	   OLD.duration_unit IS DISTINCT FROM NEW.duration_unit OR
	   OLD.catalog_policy_snapshot_id IS DISTINCT FROM NEW.catalog_policy_snapshot_id OR
	   OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key THEN
		RAISE EXCEPTION 'Order purchased terms are immutable; only status and lifecycle timestamps may be updated on order %', OLD.id;
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_order_purchase_terms
BEFORE UPDATE
ON orders
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_order_purchase_terms();
--> statement-breakpoint

-- Function 8: Immutability guard for settlements
CREATE OR REPLACE FUNCTION phase4_guard_settlement_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'Settlement records are immutable; mutation or deletion is forbidden on settlements (id: %)', OLD.id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER phase4_trg_guard_settlement_mutation
BEFORE UPDATE OR DELETE
ON settlements
FOR EACH ROW
EXECUTE FUNCTION phase4_guard_settlement_mutation();
