import { vytvorHexikaPlus } from "./hexik-plus";
import { vytvorHexika3D } from "../../../src/lib/hexik3d/scena";
(window as unknown as Record<string, unknown>).HexikPlus = { vytvorHexikaPlus, vytvorHexika3D };
