# Kometa Configuration for PlexSwipe

To display the "Requested By" tags on your cards, you need to configure Kometa (formerly Plex Meta Manager) to sync labels from your request services (Overseerr/Seerr) to Plex.

## 1. How the Flow Works
1. **Overseerr** sends requests to Radarr/Sonarr.
2. In Overseerr settings, you must enable **Tag Requests** so the requester's username is added as a tag (e.g., `requester:john`) in Radarr/Sonarr.
3. **Kometa** runs, finds items in Radarr/Sonarr with those tags, and applies the `Requested by: john` label directly to the media inside Plex.
4. **PlexSwipe** reads the Plex labels and displays the badge on the card.

## 2. Correct Kometa Configuration

> **Important Note:** For this builder to work, you must ensure that your Kometa `config.yml` is configured with connection details for your Radarr and Sonarr instances in the global `radarr` and `sonarr` settings blocks.

Add the following to your Kometa `config.yml` (or an external metadata file):

```yaml
templates:
  requester_label:
    # This builder looks for the specific tag in Radarr/Sonarr
    radarr_taglist: <<tag>>
    sonarr_taglist: <<tag>>
    # This applies the label directly to the item in Plex
    item_label: "Requested by: <<user_name>>"

collections:
  # You must define an entry for each Overseerr user you want to track
  User Request - John:
    template:
      name: requester_label
      tag: requester:john  # The tag Overseerr adds to Radarr
      user_name: john      # The name you want displayed in PlexSwipe

  User Request - Jane:
    template:
      name: requester_label
      tag: requester:jane
      user_name: jane
```

## 3. Refreshing
After updating your Kometa config, run Kometa. 
Once the labels appear in Plex (visible in the "Labels" field when you click Edit -> Tags on a movie/show), PlexSwipe will automatically pick them up and show them in the top-left corner of the card.
