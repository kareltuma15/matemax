import { vytvorPokojicek, KOUZLA } from "../../../src/lib/hexik3d/pokojicek";
(window as unknown as { Domov: unknown }).Domov = { vytvor: vytvorPokojicek, KOUZLA };
