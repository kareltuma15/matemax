import * as O from "./odmeny3d";
import { vytvorHexika3D } from "../../../src/lib/hexik3d/scena";
(window as unknown as { Odmeny3D: typeof O & { vytvorHexika3D: typeof vytvorHexika3D } }).Odmeny3D = { ...O, vytvorHexika3D };
