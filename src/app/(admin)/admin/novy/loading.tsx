import "./admin2.css";

/** Kostra stránky při načítání (KO-07): místo prázdna tvar budoucí stránky. */
export default function Nacitani() {
  return (
    <div className="a2" aria-busy="true" aria-label="Načítám">
      <div className="a2-obsah">
        <div className="a2-kostra" style={{ height: 44 }} />
        <div className="a2-kostra" style={{ height: 120 }} />
        <div className="a2-kostra" style={{ height: 120 }} />
        <div className="a2-dlazdice">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="a2-kostra" style={{ height: 96 }} />)}</div>
      </div>
    </div>
  );
}
