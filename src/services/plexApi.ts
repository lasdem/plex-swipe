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
    // We create a new chain that always continues even if the current task fails.
    const taskPromise = this.queue.then(async () => {
      try {
        await task();
      } catch (err) {
        console.error('Task in PlexService queue failed:', err);
        throw err; // Re-throw so the returned promise rejects
      }
    });

    // Update this.queue to a promise that always resolves, so the NEXT task can run.
    this.queue = taskPromise.catch(() => {}); 
    
    return taskPromise;
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

  /**
   * Batches multiple tag updates into a single PUT request.
   * This is much more efficient than sequential requests.
   */
  async updateTags(
    ratingKey: string, 
    additions: { type: 'label' | 'collection', value: string }[],
    removals: { type: 'label' | 'collection', value: string }[]
  ): Promise<void> {
    return this.enqueue(async () => {
      const queryParts: string[] = [];
      
      const addCounters: Record<string, number> = {
        'label': 0,
        'collection': 0
      };

      const remCounters: Record<string, number> = {
        'label': 0,
        'collection': 0
      };

      additions.forEach(add => {
        const index = addCounters[add.type]++;
        const key = `${add.type}[${index}].tag.tag`;
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(add.value)}`);
      });

      removals.forEach(rem => {
        const index = remCounters[rem.type]++;
        const key = `${rem.type}[${index}].tag.tag-`;
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(rem.value)}`);
      });

      // Lock the fields if we made changes
      if (addCounters['label'] > 0 || remCounters['label'] > 0) {
        queryParts.push(`${encodeURIComponent('label.locked')}=1`);
      }
      if (addCounters['collection'] > 0 || remCounters['collection'] > 0) {
        queryParts.push(`${encodeURIComponent('collection.locked')}=1`);
      }

      if (queryParts.length === 0) return;

      const queryString = queryParts.join('&');
      const url = this.getUrl(`/library/metadata/${ratingKey}?${queryString}`);
      
      await axios.put(url, null, {
        headers: this.getHeaders()
      });
    });
  }

  async addTag(ratingKey: string, tagType: 'label' | 'collection', tagValue: string): Promise<void> {
    return this.updateTags(ratingKey, [{ type: tagType, value: tagValue }], []);
  }

  async removeTag(ratingKey: string, tagType: 'label' | 'collection', tagValue: string): Promise<void> {
    return this.updateTags(ratingKey, [], [{ type: tagType, value: tagValue }]);
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
    // crypto.randomUUID() is only available in secure contexts (HTTPS)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      clientId = crypto.randomUUID();
    } else {
      // Simple fallback for non-secure contexts
      clientId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
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
