// export interface Post {
//   id: string
//   title: string
//   author: string
//   subreddit: string
//   score: number
//   num_comments: number
//   created: number
//   url: string
//   selftext: string
//   is_video: boolean
//   domain: string
//   media: any
//   permalink: string
//   likes: boolean | null
//   saved: boolean
//   over_18: boolean
//   subreddit_name_prefixed: string
//   subreddit_id: string
//   subreddit_subscribers: number
//   subreddit_type: string
//   thumbnail: string
//   thumbnail_height?: number
//   thumbnail_width?: number
//   preview?: {
//     images: Array<{
//       source: {
//         url: string
//         width: number
//         height: number
//       }
//       resolutions: Array<{
//         url: string
//         width: number
//         height: number
//       }>
//     }>
//   }
//   gallery_data?: {
//     items: Array<{
//       media_id: string
//       id: number
//     }>
//   }
//   media_metadata?: Record<string, {
//     status: string
//     e: string
//     m: string
//     p: Array<{
//       y: number
//       x: number
//       u: string
//     }>
//     s: {
//       y: number
//       x: number
//       u: string
//     }
//   }>
// }

// Update the Media interface to include audio-specific properties

export interface Post {
  id: string
  title: string
  author: string
  author_fullname?: string
  subreddit: string
  subreddit_id: string
  subreddit_name_prefixed: string
  subreddit_type: string
  subreddit_subscribers: number
  score: number
  ups?: number
  downs?: number
  upvote_ratio?: number
  num_comments: number
  created: number
  created_utc?: number
  url: string
  selftext: string
  selftext_html?: null | string
  is_video: boolean
  domain: string
  media?: {
    reddit_video?: {
      bitrate_kbps?: number
      fallback_url?: string
      has_audio?: boolean
      height?: number
      width?: number
      scrubber_media_url?: string
      dash_url?: string
      duration?: number
      hls_url?: string
      is_gif?: boolean
      transcoding_status?: string
    }
    type?: string
    oembed?: any
  }
  permalink: string
  likes: boolean | null
  saved: boolean
  hidden?: boolean
  over_18: boolean
  stickied?: boolean
  link_flair_text?: string
  link_flair_type?: string
  link_flair_background_color?: string
  link_flair_text_color?: string
  link_flair_richtext?: Array<{
    e: string
    t: string
  }>
  thumbnail: string
  thumbnail_height?: number
  thumbnail_width?: number
  post_hint?: string
  is_gallery: boolean
  is_self?: boolean
  is_meta?: boolean
  is_original_content?: boolean
  distinguished?: string | null

  // Preview data
  preview?: {
    images: Array<{
      source: {
        url: string
        width: number
        height: number
      }
      resolutions: Array<{
        url: string
        width: number
        height: number
      }>
      variants?: any
      id?: string
    }>
    enabled?: boolean
    reddit_video_preview?: {
      bitrate_kbps?: number
      fallback_url?: string
      height?: number
      width?: number
      scrubber_media_url?: string
      dash_url?: string
      duration?: number
      hls_url?: string
      is_gif?: boolean
      transcoding_status?: string
    }
  }

  // Gallery data
  gallery_data?: {
    items: Array<{
      media_id: string
      id: number
      caption?: string
      outbound_url?: string
      layout?: string
    }>
    layout?: string
    caption?: string
    outbound_url?: string
  }

  // Media metadata for gallery posts
  media_metadata?: Record<
    string,
    {
      status: string
      e: string
      m: string
      p?: Array<{
        y: number
        x: number
        u: string
      }>
      s: {
        y: number
        x: number
        u?: string
        gif?: string
        mp4?: string
      }
      id?: string
    }
  >

  // Crosspost data
  crosspost_parent?: string
  crosspost_parent_list?: Post[]
  is_crosspostable?: boolean

  // Additional fields from the JSON
  approved_at_utc?: null | number
  mod_reason_title?: null | string
  gilded?: number
  clicked?: boolean
  pwls?: null | number
  top_awarded_type?: null | string
  hide_score?: boolean
  name?: string
  quarantine?: boolean
  total_awards_received?: number
  media_embed?: any
  secure_media?: any
  secure_media_embed?: any
  can_mod_post?: boolean
  approved_by?: null | string
  is_created_from_ads_ui?: boolean
  author_premium?: boolean
  edited?: boolean | number
  author_flair_css_class?: null | string
  author_flair_richtext?: any[]
  gildings?: any
  content_categories?: null | string[]
  mod_note?: null | string
  treatment_tags?: any[]
  visited?: boolean
  removed_by?: null | string
  num_reports?: null | number
  banned_by?: null | string
  author_flair_type?: string
  allow_live_comments?: boolean
  suggested_sort?: null | string
  banned_at_utc?: null | number
  view_count?: null | number
  archived?: boolean
  no_follow?: boolean
  pinned?: boolean
  all_awardings?: any[]
  awarders?: any[]
  media_only?: boolean
  can_gild?: boolean
  spoiler?: boolean
  locked?: boolean
  author_flair_text?: null | string
  removed_by_category?: null | string
  discussion_type?: null | string
  send_replies?: boolean
  contest_mode?: boolean
  author_patreon_flair?: boolean
  author_flair_text_color?: null | string
  author_flair_background_color?: null | string
  num_crossposts?: number
  mod_reports?: any[]
  removal_reason?: null | string
  report_reasons?: null | string[]
  user_reports?: any[]
}
export interface Media {
  url: string
  type: string
  width: number
  height: number
  poster?: string
  duration?: number
  title?: string
  artist?: string
}

export interface Subreddit {
  id: string
  name: string
  display_name: string
  title: string
  description: string
  subscribers: number
  created_utc: number
  over18: boolean
  icon_img?: string
  banner_img?: string
  public_description: string
  user_is_subscriber: boolean
  user_is_moderator: boolean
  url: string
}

export interface UserPreferences {
  over_18: boolean
  email_unsubscribe_all: boolean
  hide_from_robots: boolean
  show_link_flair: boolean
  show_trending: boolean
  show_user_flair: boolean
  label_nsfw: boolean
  enable_followers: boolean
  nightmode: boolean
  country_code: string
  display_name: string
  hide_ads: boolean
  theme_selector: string
  threaded_messages: boolean
  use_global_defaults: boolean
  beta: boolean
  default_comment_sort: string
  feed_recommendations_enabled: boolean
  collapse_read_messages: boolean
  mark_messages_read: boolean
  email_chat_request: boolean
  email_comment_reply: boolean
  email_digests: boolean
  email_messages: boolean
  email_post_reply: boolean
  email_private_message: boolean
  email_upvote_comment: boolean
  email_upvote_post: boolean
  email_user_new_follower: boolean
  email_username_mention: boolean
  accept_pms: string
  activity_relevant_ads: boolean
  allow_clicktracking: boolean
  autoplay_media: boolean
  search_include_over_18: boolean
  show_presence: boolean
  show_snoovatar: boolean
  top_karma_subreddits: boolean
  video_autoplay: boolean
}

export interface Comment {
  id: string
  author: string
  body: string
  body_html: string
  score: number
  created_utc: number
  depth: number
  replies?: Comment[]
  is_submitter: boolean
  distinguished?: string | null
  stickied?: boolean
  collapsed?: boolean
  score_hidden?: boolean
  likes: boolean | null
  saved: boolean
}

