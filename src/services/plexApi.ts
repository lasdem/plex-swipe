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

export interface PlexTag {
  tag: string;
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
  Label?: PlexTag[];
  Labels?: PlexTag[]; // Some libraries use Labels instead of Label
  Collection?: PlexTag[];
}

export interface PlexServer {
  name: string;
  clientIdentifier: string;
  uri: string;
  local: boolean;
}

export interface PlexResourceConnection {
  protocol: string;
  address: string;
  port: number;
  uri: string;
  local: boolean;
}

export interface PlexResource {
  name: string;
  clientIdentifier: string;
  provides: string;
  connections: PlexResourceConnection[];
}

export class PlexService {
  private baseUrl: string;
  private token: string;
  private queue: Promise<void> = Promise.resolve();

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(async () => {
      try {
        await task();
      } catch (err) {
        console.error('Task in PlexService queue failed:', err);
        throw err;
      }
    });
    return this.queue;
  }

  private getHeaders() {
    return {
      'Accept': 'application/json',
      'X-Plex-Token': this.token,
      'X-Plex-Client-Identifier': getClientIdentifier(),
      'X-Plex-Product': APP_NAME,
      'X-Plex-Device': 'Web',
      'X-Plex-Platform': 'Web',
      'X-Plex-Features': 'external-media,collections,details',
    };
  }

  private getUrl(path: string) {
    return `${this.baseUrl}${path}`;
  }

  async getLibraries(): Promise<PlexLibrary[]> {
    const response = await axios.get(this.getUrl('/library/sections'), {
      headers: this.getHeaders()
    });
    return response.data.MediaContainer.Directory || [];
  }

  async getLibraryItems(libraryId: string): Promise<PlexMediaItem[]> {
    const params = new URLSearchParams({
      includeCollections: '1',
      includeExternalMedia: '1',
      includeAdvanced: '1',
      includeDetails: '1',
      includeGuids: '1',
      checkFiles: '1',
      'X-Plex-Container-Start': '0',
      'X-Plex-Container-Size': '500',
    });
    const response = await axios.get(this.getUrl(`/library/sections/${libraryId}/all?${params.toString()}`), {
      headers: this.getHeaders()
    });
    return response.data.MediaContainer.Metadata || [];
  }

  async getMetadata(ratingKey: string): Promise<PlexMediaItem> {
    const params = new URLSearchParams({
      includeCollections: '1',
      includeAdvanced: '1',
    });
    const response = await axios.get(this.getUrl(`/library/metadata/${ratingKey}?${params.toString()}`), {
      headers: this.getHeaders()
    });
    return response.data.MediaContainer.Metadata[0];
  }

  async addTag(ratingKey: string, tagType: 'label' | 'collection', tagValue: string): Promise<void> {
    return this.enqueue(async () => {
      const params = new URLSearchParams({
        [`${tagType}[0].tag.tag`]: tagValue,
        [`${tagType}.locked`]: '1'
      });
      await axios.put(this.getUrl(`/library/metadata/${ratingKey}?${params.toString()}`), null, {
        headers: this.getHeaders()
      });
    });
  }

  async removeTag(ratingKey: string, tagType: 'label' | 'collection', tagValue: string): Promise<void> {
    return this.enqueue(async () => {
      const params = new URLSearchParams({
        [`${tagType}[0].tag.tag-`]: tagValue,
        [`${tagType}.locked`]: '1'
      });
      await axios.put(this.getUrl(`/library/metadata/${ratingKey}?${params.toString()}`), null, {
        headers: this.getHeaders()
      });
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

// --- OAuth / Auth Helper Methods ---

const PLEX_TV_URL = 'https://plex.tv/api/v2';
const APP_NAME = 'PlexSwipe';

export const getClientIdentifier = (): string => {
  let clientId = localStorage.getItem('plex_client_id');
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem('plex_client_id', clientId);
  }
  return clientId;
};

export const requestPin = async () => {
  const clientId = getClientIdentifier();
  const response = await axios.post(`${PLEX_TV_URL}/pins`, {
    strong: true
  }, {
    headers: {
      'Accept': 'application/json',
      'X-Plex-Product': APP_NAME,
      'X-Plex-Client-Identifier': clientId,
    }
  });
  return response.data; // { id, code, ... }
};

export const checkPinStatus = async (pinId: number) => {
  const clientId = getClientIdentifier();
  const response = await axios.get(`${PLEX_TV_URL}/pins/${pinId}`, {
    headers: {
      'Accept': 'application/json',
      'X-Plex-Client-Identifier': clientId,
    }
  });
  return response.data; // { id, code, authToken, ... }
};

export const signOut = async (token: string) => {
  const clientId = getClientIdentifier();
  try {
    await axios.delete(`${PLEX_TV_URL}/users/signout`, {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': token,
        'X-Plex-Client-Identifier': clientId,
      }
    });
  } catch (err) {
    // Even if signout fails (e.g. token already expired), we proceed with local logout
    console.error('Plex server-side signout failed:', err);
  }
};

export const getServers = async (token: string): Promise<PlexServer[]> => {
  const clientId = getClientIdentifier();
  const response = await axios.get(`${PLEX_TV_URL}/resources?includeHttps=1`, {
    headers: {
      'Accept': 'application/json',
      'X-Plex-Token': token,
      'X-Plex-Client-Identifier': clientId,
    }
  });

  const resources: PlexResource[] = response.data || [];
  const servers: PlexServer[] = [];

  resources.forEach((resource) => {
    if (resource.provides.includes('server')) {
      const connections = resource.connections || [];
      connections.forEach((conn) => {
        // Add the original URI (usually HTTPS .plex.direct if includeHttps=1)
        servers.push({
          name: `${resource.name} (${conn.local ? 'Local' : 'Remote'})`,
          clientIdentifier: resource.clientIdentifier,
          uri: conn.uri,
          local: conn.local,
        });

        // If it's a local connection and using HTTPS, also offer a plain HTTP fallback
        if (conn.local && conn.uri.startsWith('https://') && conn.address) {
          const port = conn.port || 32400;
          servers.push({
            name: `${resource.name} (Local IP Fallback)`,
            clientIdentifier: resource.clientIdentifier,
            uri: `http://${conn.address}:${port}`,
            local: true,
          });
        }
      });
    }
  });

  // Remove duplicates (sometimes multiple connections point to the same URI)
  return servers.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);
};
