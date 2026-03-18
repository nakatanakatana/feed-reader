import { createClient } from "@connectrpc/connect";

import { ItemService } from "../../gen/item/v1/item_pb";
import { transport } from "../query";

export const itemClient = createClient(ItemService, transport);
