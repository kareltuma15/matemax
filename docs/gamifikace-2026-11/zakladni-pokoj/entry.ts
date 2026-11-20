import { vytvorZakladniPokojicek, KOUZLA_ZAKLADNI } from "../../../src/lib/hexik3d/zakladni";
(window as unknown as { Domov: unknown }).Domov = { vytvor: vytvorZakladniPokojicek, KOUZLA: KOUZLA_ZAKLADNI };
