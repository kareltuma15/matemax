import { vytvorChaloupku, KOUZLA_CHALOUPKY } from "../../../src/lib/hexik3d/chaloupka";
(window as unknown as { Domov: unknown }).Domov = { vytvor: vytvorChaloupku, KOUZLA: KOUZLA_CHALOUPKY };
