import axios from 'axios';

export interface PlexLibrary {
  uuid: string;
  key: string;
  type: string;
  title: string;
  agent: string;
  scanner: string;
  language: string;
  composite: string;
}

export interface PlexMediaItem {
  ratingKey: string;
  key: string;
  guid: string;
  type: string;
  title: string;
  summary: string;
  thumb: string;
  year: number;
  duration: number;
  addedAt: number;
  updatedAt: number;
  Label?: { tag: string }[];
  Collection?: { tag: string }[];
}

export class PlexService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private getUrl(path: string) {
    const separator = path.includes('?') ? '&' : '?';
    return `${this.baseUrl}${path}${separator}X-Plex-Token=${this.token}`;
  }

  async getLibraries(): Promise<PlexLibrary[]> {
    const response = await axios.get(this.getUrl('/library/sections'), {
      headers: { 'Accept': 'application/json' }
    });
    return response.data.MediaContainer.Directory || [];
  }

  async getLibraryItems(libraryId: string): Promise<PlexMediaItem[]> {
    const response = await axios.get(this.getUrl(`/library/sections/${libraryId}/all`), {
      headers: { 'Accept': 'application/json' }
    });
    return response.data.MediaContainer.Metadata || [];
  }

  async addTag(ratingKey: string, tagType: 'label' | 'collection', tagValue: string): Promise<void> {
    const params = new URLSearchParams({
      [`${tagType}[0].tag.tag`]: tagValue,
      [`${tagType}.locked`]: '1'
    });
    await axios.put(this.getUrl(`/library/metadata/${ratingKey}?${params.toString()}`), null, {
      headers: { 'Accept': 'application/json' }
    });
  }

  async removeTag(ratingKey: string, tagType: 'label' | 'collection', tagValue: string): Promise<void> {
    const params = new URLSearchParams({
      [`${tagType}[0].tag.tag-`]: tagValue,
      [`${tagType}.locked`]: '1'
    });
    await axios.put(this.getUrl(`/library/metadata/${ratingKey}?${params.toString()}`), null, {
      headers: { 'Accept': 'application/json' }
    });
  }

  getTranscodedPhotoUrl(path: string, width: number = 300, height: number = 450): string {
    const params = new URLSearchParams({
      url: path,
      width: width.toString(),
      height: height.toString(),
      minSize: '1',
      upscale: '1',
      'X-Plex-Token': this.token
    });
    return `${this.baseUrl}/photo/:/transcode?${params.toString()}`;
  }
}
