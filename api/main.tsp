import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{ title: "Feed Reader API" })
@server("/api/v2")
namespace FeedReader;

alias DateTime = utcDateTime;
alias Int64String = string;

model ApiError {
  code: string;
  message: string;
}

model ErrorResponse {
  @statusCode statusCode: 500;
  @body body: ApiError;
}

model Tag {
  id: string;
  name: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  unreadCount: Int64String;
  feedCount: Int64String;
}

model Feed {
  id: string;
  url: string;
  link?: string;
  title: string;
  lastFetchedAt?: DateTime;
  nextFetchAt?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
  tags: Tag[];
  unreadCount: Int64String;
}

model ItemFeed {
  id: string;
  title: string;
}

model Item {
  id: string;
  url: string;
  title: string;
  description: string;
  publishedAt?: DateTime;
  feedId: string;
  isRead: boolean;
  author: string;
  content: string;
  imageUrl: string;
  categories: string;
  feeds?: ItemFeed[];
  createdAt: DateTime;
}

model ListFeedsResponse {
  feeds: Feed[];
}

model ListTagsResponse {
  tags: Tag[];
  totalUnreadCount: Int64String;
}

model ListItemsResponse {
  items: Item[];
  nextPageToken: string;
}

model GetItemResponse {
  item?: Item;
}

model EmptyResponse {}

model CreateFeedRequest {
  url: string;
  tagIds: string[];
}

model CreateFeedResponse {
  feed: Feed;
}

model RefreshFeedsRequest {
  ids: string[];
}

model FeedFetchStatus {
  feedId: string;
  success: boolean;
  newItemsCount: int32;
  errorMessage?: string;
}

model RefreshFeedsResponse {
  results: FeedFetchStatus[];
}

model ImportFailedFeed {
  url: string;
  errorMessage: string;
}

model ImportOpmlRequest {
  opmlContent: bytes;
}

model ImportOpmlResponse {
  total: int32;
  success: int32;
  skipped: int32;
  failedFeeds: ImportFailedFeed[];
}

model UpdateItemStatusRequest {
  ids: string[];
  isRead?: boolean;
}

model CreateTagRequest {
  name: string;
}

model CreateTagResponse {
  tag: Tag;
}

model FeedTag {
  feedId: string;
  tagId: string;
}

model ListFeedTagsResponse {
  feedTags: FeedTag[];
}

model ManageFeedTagsRequest {
  feedIds: string[];
  addTagIds: string[];
  removeTagIds: string[];
}

model SuspendFeedsRequest {
  ids: string[];
  suspendSeconds: Int64String;
}

model ExportOpmlRequest {
  ids: string[];
}

model ExportOpmlResponse {
  opmlContent: bytes;
}

model ItemRead {
  itemId: string;
  isRead: boolean;
  updatedAt: DateTime;
}

model ListItemReadResponse {
  itemReads: ItemRead[];
  nextPageToken: string;
}

model URLParsingRule {
  id: string;
  domain: string;
  ruleType: string;
  pattern: string;
}

model ListURLParsingRulesResponse {
  rules: URLParsingRule[];
}

model AddURLParsingRuleRequest {
  domain: string;
  ruleType: string;
  pattern: string;
}

model AddURLParsingRuleResponse {
  rule: URLParsingRule;
}

model ItemBlockRule {
  id: string;
  ruleType: string;
  value: string;
  domain?: string;
}

model ListItemBlockRulesResponse {
  rules: ItemBlockRule[];
}

model AddItemBlockRuleInput {
  ruleType: string;
  value: string;
  domain?: string;
}

model AddItemBlockRulesRequest {
  rules: AddItemBlockRuleInput[];
}

@route("/feeds")
namespace Feeds {
  @get
  op list(@query tagId?: string): ListFeedsResponse | ErrorResponse;

  @post
  op create(@body body: CreateFeedRequest): CreateFeedResponse | ErrorResponse;

  @delete
  @route("/{id}")
  op delete(@path id: string): EmptyResponse | ErrorResponse;

  @post
  @route("/refresh")
  op refresh(@body body: RefreshFeedsRequest): RefreshFeedsResponse | ErrorResponse;

  @post
  @route("/import-opml")
  op importOpml(@body body: ImportOpmlRequest): ImportOpmlResponse | ErrorResponse;

  @post
  @route("/export-opml")
  op exportOpml(@body body: ExportOpmlRequest): ExportOpmlResponse | ErrorResponse;

  @post
  @route("/suspend")
  op suspend(@body body: SuspendFeedsRequest): EmptyResponse | ErrorResponse;
}

@route("/tags")
namespace Tags {
  @get
  op list(): ListTagsResponse | ErrorResponse;

  @post
  op create(@body body: CreateTagRequest): CreateTagResponse | ErrorResponse;

  @delete
  @route("/{id}")
  op delete(@path id: string): EmptyResponse | ErrorResponse;
}

@route("/feed-tags")
namespace FeedTags {
  @get
  op list(
    @query feedId?: string,
    @query tagId?: string,
  ): ListFeedTagsResponse | ErrorResponse;

  @post
  @route("/manage")
  op manage(@body body: ManageFeedTagsRequest): EmptyResponse | ErrorResponse;
}

@route("/items")
namespace Items {
  @get
  op list(
    @query feedId?: string,
    @query isRead?: boolean,
    @query tagId?: string,
    @query since?: DateTime,
    @query pageSize?: int32,
    @query pageToken?: string,
  ): ListItemsResponse | ErrorResponse;

  @get
  @route("/{id}")
  op get(@path id: string): GetItemResponse | ErrorResponse;

  @post
  @route("/status")
  op updateStatus(@body body: UpdateItemStatusRequest): EmptyResponse | ErrorResponse;
}

@route("/item-reads")
namespace ItemReads {
  @get
  op list(
    @query since?: DateTime,
    @query pageSize?: int32,
    @query pageToken?: string,
  ): ListItemReadResponse | ErrorResponse;
}

@route("/url-rules")
namespace URLRules {
  @get
  op list(): ListURLParsingRulesResponse | ErrorResponse;

  @post
  op add(@body body: AddURLParsingRuleRequest): AddURLParsingRuleResponse | ErrorResponse;

  @delete
  @route("/{id}")
  op delete(@path id: string): EmptyResponse | ErrorResponse;
}

@route("/block-rules")
namespace BlockRules {
  @get
  op list(): ListItemBlockRulesResponse | ErrorResponse;

  @post
  op add(@body body: AddItemBlockRulesRequest): EmptyResponse | ErrorResponse;

  @delete
  @route("/{id}")
  op delete(@path id: string): EmptyResponse | ErrorResponse;
}
