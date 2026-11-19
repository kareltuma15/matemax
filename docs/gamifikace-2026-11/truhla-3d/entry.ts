import { vytvorNovouTruhlu, BARVA } from "./nova-truhla";
import { vytvorProhlidku } from "./prohlidka";
(window as unknown as Record<string, unknown>).NovaTruhla = { vytvorNovouTruhlu, vytvorProhlidku, BARVA };
