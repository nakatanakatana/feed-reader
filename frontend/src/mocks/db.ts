// @ts-nocheck — wraps @msw/data Collection internals with a synchronous ORM-like API
import {
  Collection,
  kPrimaryKey,
  kRelationMap,
} from "../../../node_modules/@msw/data/build/collection.mjs";
import { TypedEvent } from "rettime";
import { z } from "zod";

const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  unreadCount: z.string(),
  feedCount: z.string(),
});

const feedSchema = z.object({
  id: z.string(),
  url: z.string(),
  link: z.string(),
  title: z.string(),
  lastFetchedAt: z.string(),
  nextFetchAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  unreadCount: z.string(),
  get tags() {
    return z.array(tagSchema);
  },
});

const itemSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  publishedAt: z.string(),
  feedId: z.string().optional(),
  isRead: z.boolean(),
  author: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  categories: z.string().optional(),
  createdAt: z.string(),
});

const urlRuleSchema = z.object({
  id: z.string(),
  domain: z.string(),
  ruleType: z.string(),
  pattern: z.string(),
});

const blockRuleSchema = z.object({
  id: z.string(),
  ruleType: z.string(),
  value: z.string(),
  domain: z.string().optional(),
});

const tagCollection = new Collection({ schema: tagSchema });
const feedCollection = new Collection({ schema: feedSchema });
const itemCollection = new Collection({ schema: itemSchema });
const urlRuleCollection = new Collection({ schema: urlRuleSchema });
const blockRuleCollection = new Collection({ schema: blockRuleSchema });

feedCollection.defineRelations(({ many }) => ({
  tags: many(tagCollection),
}));

type WhereValue = { equals?: unknown } | unknown;
type WhereInput = Record<string, WhereValue>;

const toWherePredicate = (where: WhereInput) => {
  const flatWhere: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    if (value !== null && typeof value === "object" && "equals" in value) {
      flatWhere[key] = (value as { equals: unknown }).equals;
    } else {
      flatWhere[key] = value;
    }
  }
  return (q: { where: (criteria: Record<string, unknown>) => unknown }) =>
    q.where(flatWhere);
};

const syncCreate = <T extends z.ZodTypeAny>(
  collection: Collection<T>,
  schema: T,
  initialValues: z.input<T>,
): z.infer<T> => {
  const record = schema.parse(initialValues) as z.infer<T> &
    Record<string, unknown>;

  Object.defineProperties(record, {
    [kPrimaryKey]: {
      enumerable: false,
      configurable: false,
      value: crypto.randomUUID(),
    },
    [kRelationMap]: {
      enumerable: false,
      configurable: false,
      value: new Map(),
    },
  });

  collection.all().push(record);

  if (collection.hooks.listenerCount("create") > 0) {
    collection.hooks.emit(
      new TypedEvent("create", {
        data: { record, initialValues },
      }),
    );
  }

  return record;
};

const createModelApi = <T extends z.ZodTypeAny>(
  collection: Collection<T>,
  schema: T,
) => ({
  getAll: () => collection.all() as Array<z.infer<T>>,
  create: (data: z.input<T>) => syncCreate(collection, schema, data),
  delete: ({ where }: { where: WhereInput }) => {
    collection.delete(toWherePredicate(where));
  },
  deleteMany: ({ where }: { where: WhereInput }) => {
    if (Object.keys(where).length === 0) {
      collection.clear();
      return;
    }
    collection.deleteMany(toWherePredicate(where));
  },
  update: ({
    where,
    data,
  }: {
    where: WhereInput;
    data: Partial<z.infer<T>>;
  }) => {
    void collection.update(toWherePredicate(where), {
      data(draft) {
        Object.assign(draft, data);
      },
    });
  },
});

export const db = {
  tag: createModelApi(tagCollection, tagSchema),
  feed: createModelApi(feedCollection, feedSchema),
  item: createModelApi(itemCollection, itemSchema),
  urlRule: createModelApi(urlRuleCollection, urlRuleSchema),
  blockRule: createModelApi(blockRuleCollection, blockRuleSchema),
};

export const resetDatabase = () => {
  db.tag.deleteMany({ where: {} });
  db.feed.deleteMany({ where: {} });
  db.item.deleteMany({ where: {} });
  db.urlRule.deleteMany({ where: {} });
  db.blockRule.deleteMany({ where: {} });

  const seedTime = new Date();
  const now = seedTime.toISOString();

  const tag1 = db.tag.create({
    id: "tag-1",
    name: "Tech",
    createdAt: now,
    updatedAt: now,
    unreadCount: "5",
    feedCount: "1",
  });

  const tag2 = db.tag.create({
    id: "tag-2",
    name: "News",
    createdAt: now,
    updatedAt: now,
    unreadCount: "3",
    feedCount: "2",
  });

  db.feed.create({
    id: "1",
    url: "https://example.com/feed1.xml",
    link: "https://example.com/",
    title: "Example Feed 1",
    lastFetchedAt: now,
    createdAt: now,
    updatedAt: now,
    tags: [tag1],
    unreadCount: "0",
  });

  db.feed.create({
    id: "2",
    url: "https://example.com/feed2.xml",
    link: "https://example.com/news",
    title: "Example Feed 2",
    lastFetchedAt: now,
    createdAt: now,
    updatedAt: now,
    tags: [tag2],
    unreadCount: "0",
  });

  const base = new Date(seedTime);
  const iso = (date: Date) => date.toISOString();

  for (let i = 0; i < 40; i++) {
    const id = (i + 1).toString();
    const date = new Date(base);
    if (i < 10) date.setHours(date.getHours() - i);
    else if (i < 20) date.setDate(date.getDate() - 2);
    else if (i < 30) date.setDate(date.getDate() - 10);
    else date.setDate(date.getDate() - 40);

    db.item.create({
      id,
      title: `Item ${id}`,
      publishedAt: iso(date),
      createdAt: iso(date),
      isRead: false,
      description: `<p>Full content for item ${id}</p>`,
      author: "Mock Author",
      url: `https://example.com/item${id}`,
      categories: "",
    });
  }
};
