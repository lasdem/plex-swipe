# Kometa Configuration for PlexSwipe

To display the "Requested By" tags on your cards, you need to configure Kometa to sync labels from your request services (Overseerr/Seerr) to Plex.

## 1. Sync Seerr Requests to Plex Labels
In your Kometa `config.yml` (or individual library files), add the following `overlay` or `collection` logic to apply labels.

The app specifically looks for labels starting with `Requested by:`.

### Example Configuration:
```yaml
libraries:
  Movies:
    overlay_path:
      - remove_overlays: false
    operations:
      # This ensures Kometa syncs metadata
      metadata_backup: false
    
    # Using Kometa builders to find requested items
    collections:
      Requested Items:
        seerr_requests: true
        # Apply the label to every item found via Seerr
        label: Requested by:<<user_name>>
        # Note: You might need a dynamic template if you want specific names.
        # If your Seerr setup doesn't support the dynamic name in the label field,
        # you can use Kometa's Overlay feature to write the label.
```

## 2. Dynamic Labeling (Advanced)
If you want to pull the exact username from Sonarr/Radarr tags (synced by Seerr), you can use Kometa's `label` attribute within a `template`.

```yaml
templates:
  requester_label:
    label: Requested by:<<value>>

collections:
  User Requests:
    radarr_tag: "user:*" # Matches tags like user:john, user:doe
    template:
      name: requester_label
      value: <<radarr_tag>>
```

## 3. Refreshing
After updating your Kometa config, run it. Once the labels appear in Plex (visible in the "Labels" field in Edit -> Tags), PlexSwipe will automatically pick them up and show them in the top-right corner of the card.
