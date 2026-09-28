import {
  MediaTeamMetrics,
  AttentionItem,
  MediaContentItem,
  SeriesContentItem,
  MediaAssetItem,
  MediaContentStatus,
} from '@/types/mediaTeam';
import {
  mockMediaTeamMetrics,
  mockAttentionItems,
  mockMediaMovies,
  mockMediaSeries,
  mockMediaAssets,
} from '@/data/mock/mediaTeamData';

class MediaTeamRepository {
  private metrics: MediaTeamMetrics = { ...mockMediaTeamMetrics };
  private attentionItems: AttentionItem[] = [...mockAttentionItems];
  private movies: MediaContentItem[] = [...mockMediaMovies];
  private series: SeriesContentItem[] = [...mockMediaSeries];
  private assets: MediaAssetItem[] = [...mockMediaAssets];

  async getMetrics(): Promise<MediaTeamMetrics> {
    return { ...this.metrics };
  }

  async getAttentionItems(): Promise<AttentionItem[]> {
    return [...this.attentionItems];
  }

  async resolveAttentionItem(id: string): Promise<AttentionItem> {
    const item = this.attentionItems.find(a => a.id === id);
    if (!item) throw new Error(`Attention item ${id} was not found.`);
    item.resolved = true;
    return { ...item };
  }

  async getMovies(filter?: {
    query?: string;
    status?: string;
    category?: string;
    dj?: string;
  }): Promise<MediaContentItem[]> {
    let result = [...this.movies];

    if (filter?.status && filter.status !== 'all') {
      result = result.filter(m => m.status === filter.status);
    }

    if (filter?.category && filter.category !== 'all') {
      result = result.filter(m =>
        m.categoryNames.some(c => c.toLowerCase().includes(filter.category!.toLowerCase()))
      );
    }

    if (filter?.dj && filter.dj !== 'all') {
      result = result.filter(m =>
        m.versions.some(v => v.djName.toLowerCase().includes(filter.dj!.toLowerCase()))
      );
    }

    if (filter?.query && filter.query.trim() !== '') {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        m =>
          m.title.toLowerCase().includes(q) ||
          m.originalTitle.toLowerCase().includes(q) ||
          m.slug.toLowerCase().includes(q) ||
          m.codeId.toLowerCase().includes(q) ||
          m.versions.some(v => v.djName.toLowerCase().includes(q))
      );
    }

    return result;
  }

  async getMovieById(id: string): Promise<MediaContentItem | undefined> {
    return this.movies.find(m => m.id === id || m.slug === id);
  }

  async createMovie(data: Partial<MediaContentItem>): Promise<MediaContentItem> {
    const newMovie: MediaContentItem = {
      id: `mov-${Date.now().toString().slice(-4)}`,
      codeId: `#MOV-${Math.floor(1000 + Math.random() * 9000)}`,
      slug: data.slug || (data.title ? data.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'new-movie'),
      title: data.title || 'Untitled Movie',
      originalTitle: data.originalTitle || data.title || 'Untitled',
      contentType: 'MOVIE',
      releaseYear: data.releaseYear || new Date().getFullYear(),
      durationMinutes: data.durationMinutes || 110,
      posterUrl: data.posterUrl || '/posters/godzilla.jpg',
      backdropUrl: data.backdropUrl || '/backdrops/godzilla_bg.jpg',
      trailerUrl: data.trailerUrl || '/trailers/trailer.mp4',
      categoryNames: data.categoryNames || ['Action'],
      countryNames: data.countryNames || ['Tanzania'],
      description: data.description || 'Movie synopsis goes here.',
      versions: data.versions || [
        {
          id: `ver-${Date.now()}`,
          djId: 'dj-afro',
          djName: 'DJ Afro Amigo',
          versionLabel: 'DJ Afro Standard',
          streamingStatus: 'processing',
          downloadStatus: 'not_available',
          readinessStatus: 'draft',
        },
      ],
      streamingStatus: data.streamingStatus || 'processing',
      downloadStatus: data.downloadStatus || 'not_available',
      completenessPercent: data.completenessPercent || 78,
      checklist: data.checklist || {
        basicInfo: true,
        poster: true,
        backdrop: true,
        trailer: true,
        categories: true,
        countries: true,
        djAssigned: true,
        streamingMedia: false,
        downloadMedia: false,
      },
      status: data.status || 'DRAFT',
      updatedAt: 'Just now',
      lastEditedBy: 'Studio Team',
    };

    this.movies.unshift(newMovie);
    this.metrics.totalMovies += 1;
    this.metrics.draftCount += 1;
    return { ...newMovie };
  }

  async updateMovie(id: string, data: Partial<MediaContentItem>): Promise<MediaContentItem> {
    const index = this.movies.findIndex(m => m.id === id);
    if (index === -1) throw new Error(`Movie ${id} was not found.`);
    this.movies[index] = {
      ...this.movies[index],
      ...data,
      updatedAt: 'Just now',
    };
    return { ...this.movies[index] };
  }

  async deleteMovie(id: string): Promise<boolean> {
    const prev = this.movies.length;
    this.movies = this.movies.filter(m => m.id !== id);
    if (this.movies.length < prev) {
      this.metrics.totalMovies -= 1;
      return true;
    }
    return false;
  }

  async getSeries(filter?: { query?: string; status?: string }): Promise<SeriesContentItem[]> {
    let result = [...this.series];

    if (filter?.status && filter.status !== 'all') {
      result = result.filter(s => s.status === filter.status);
    }

    if (filter?.query && filter.query.trim() !== '') {
      const q = filter.query.toLowerCase().trim();
      result = result.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.originalTitle.toLowerCase().includes(q) ||
          s.codeId.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async getSeriesById(id: string): Promise<SeriesContentItem | undefined> {
    return this.series.find(s => s.id === id || s.slug === id);
  }

  async createSeries(data: Partial<SeriesContentItem>): Promise<SeriesContentItem> {
    const newSeries: SeriesContentItem = {
      id: `ser-${Date.now().toString().slice(-4)}`,
      codeId: `#SER-${Math.floor(100 + Math.random() * 900)}`,
      slug: data.slug || (data.title ? data.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'new-series'),
      title: data.title || 'Untitled Series',
      originalTitle: data.originalTitle || data.title || 'Untitled Series',
      contentType: 'SERIES',
      releaseYear: data.releaseYear || new Date().getFullYear(),
      posterUrl: data.posterUrl || '/posters/fallout.jpg',
      backdropUrl: data.backdropUrl || '/backdrops/fallout_bg.jpg',
      trailerUrl: data.trailerUrl || '/trailers/trailer.mp4',
      categoryNames: data.categoryNames || ['Drama'],
      countryNames: data.countryNames || ['United States'],
      description: data.description || 'Series synopsis.',
      seasons: data.seasons || [
        {
          id: `seas-${Date.now()}`,
          seasonNumber: 1,
          title: 'Season 1',
          status: 'DRAFT',
          episodes: [
            {
              id: `ep-${Date.now()}`,
              episodeNumber: 1,
              title: 'Episode 1: Pilot',
              durationMinutes: 55,
              description: 'First chapter of the series.',
              djName: 'DJ Afro Amigo',
              streamingStatus: 'processing',
              downloadStatus: 'not_available',
              status: 'DRAFT',
            },
          ],
        },
      ],
      totalEpisodes: 1,
      completenessPercent: 75,
      status: data.status || 'DRAFT',
      updatedAt: 'Just now',
    };

    this.series.unshift(newSeries);
    this.metrics.totalSeries += 1;
    return { ...newSeries };
  }

  async updateSeries(id: string, data: Partial<SeriesContentItem>): Promise<SeriesContentItem> {
    const index = this.series.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Series ${id} was not found.`);
    this.series[index] = {
      ...this.series[index],
      ...data,
      updatedAt: 'Just now',
    };
    return { ...this.series[index] };
  }

  async getMediaAssets(): Promise<MediaAssetItem[]> {
    return [...this.assets];
  }

  async createMediaAsset(data: Partial<MediaAssetItem>): Promise<MediaAssetItem> {
    const newAsset: MediaAssetItem = {
      id: `ast-${Date.now().toString().slice(-4)}`,
      title: data.title || 'Uploaded Media Asset',
      fileName: data.fileName || 'media_asset.mp4',
      fileSizeMb: data.fileSizeMb || 1200,
      assetKind: data.assetKind || 'STREAMING_VIDEO',
      associatedTitle: data.associatedTitle || 'Unassigned Title',
      status: data.status || 'processing',
      uploadedAt: 'Just now',
    };
    this.assets.unshift(newAsset);
    return { ...newAsset };
  }

  async submitForReview(id: string, type: 'MOVIE' | 'SERIES'): Promise<boolean> {
    if (type === 'MOVIE') {
      const movie = this.movies.find(m => m.id === id);
      if (movie) {
        movie.status = 'READY_FOR_REVIEW';
        movie.updatedAt = 'Just now';
        return true;
      }
    } else {
      const s = this.series.find(item => item.id === id);
      if (s) {
        s.status = 'READY_FOR_REVIEW';
        s.updatedAt = 'Just now';
        return true;
      }
    }
    return false;
  }
}

export const mediaTeamRepository = new MediaTeamRepository();
