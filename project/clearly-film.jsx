// Clearly Established — 120s pitch video on the Modernist system.
// Built on animations-v3.jsx (CompositionStage / useComposition / Shot).
const { CompositionStage, useComposition, Shot, Easing, animate, interpolate, clamp } = window;

const INK = '#201e1d', BG = '#f3f2f2', RED = '#ec3013', RED7 = '#ae1800';
const DIV = 'rgba(32,30,29,0.4)', MUTE = 'rgba(32,30,29,0.55)', PAPER = '#fbfaf9';
const F = "'Archivo', sans-serif";
const PAD = 120;

// The three motion helpers — all choreography goes through these.
const MOTION = {
  enter: (T, t0, d = 0.9, dy = 28) => {
    const u = animate({ from: 0, to: 1, start: t0, end: t0 + d, ease: Easing.easeOutCubic })(T);
    return { opacity: u, transform: `translateY(${(1 - u) * dy}px)` };
  },
  draw: (T, t0, d = 0.8) => {
    const u = animate({ from: 0, to: 1, start: t0, end: t0 + d, ease: Easing.easeInOutCubic })(T);
    return { transform: `scaleX(${u})`, transformOrigin: 'left center' };
  },
  drift: (T, t0, t1, amt = 0.03) => {
    const u = animate({ from: 0, to: 1, start: t0, end: t1, ease: Easing.linear })(T);
    return 1 + u * amt;
  },
};
const fadeIO = (T, t0, t1, din = 0.3, dout = 0.4) =>
  clamp((T - t0) / din, 0, 1) * clamp((t1 - T) / dout, 0, 1);

function TruMenLogo({ size = 40, color = INK, style }) {
  const P = "'Poppins', sans-serif";
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: size * 0.22, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.2, fontFamily: P, fontWeight: 700, fontStyle: 'italic', fontSize: size, letterSpacing: '0.03em', color, lineHeight: 1 }}>
        <span>TRU</span>
        <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" style={{ display: 'block' }}>
          <path d="M12 1.6l2.9 7.1 7.7.5-5.9 4.9 1.9 7.4-6.6-4.1-6.6 4.1 1.9-7.4L1.4 9.2l7.7-.5z" fill={RED} />
        </svg>
        <span>MEN</span>
      </div>
      <div style={{ fontFamily: P, fontWeight: 500, fontSize: size * 0.28, letterSpacing: '0.45em', color, textTransform: 'uppercase' }}>Productions</div>
    </div>
  );
}

function Kicker({ T, t0, children, color = RED, ruleColor = DIV, width = 900 }) {
  return (
    <div style={{ position: 'relative', width, ...MOTION.enter(T, t0, 0.7, 14) }}>
      <div style={{
        fontSize: 24, letterSpacing: '0.08em', textTransform: 'uppercase',
        color, fontWeight: 600, fontFeatureSettings: '"tnum" 1',
      }}>{children}</div>
      <div style={{ height: 2, background: ruleColor, marginTop: 22, ...MOTION.draw(T, t0 + 0.15, 0.9) }} />
    </div>
  );
}

// ── The record: one page that persists across Case → Reversal → Erasure ──
function DocPage({ T, C }) {
  const vis = fadeIO(T, C.case + 0.8, C.q + 0.4, 0.8);
  if (vis <= 0) return null;
  const scale = 1 +
    0.05 * animate({ from: 0, to: 1, start: C.case + 1, end: C.era, ease: Easing.linear })(T) +
    0.09 * animate({ from: 0, to: 1, start: C.era + 2, end: C.era + 10, ease: Easing.easeInOutSine })(T);
  const lineW = [0.96, 0.9, 0.98, 0.86, 0.94, 0.7];
  const findW = [0.95, 0.88, 0.97, 0.62];
  const filed = T >= C.rev + 1.2;
  // erasure choreography
  const struck = (i) => MOTION.draw(T, C.era + 3 + i * 0.7, 0.55);
  const goneU = animate({ from: 0, to: 1, start: C.era + 6.5, end: C.era + 8.5, ease: Easing.easeInOutCubic })(T);
  return (
    <div style={{
      position: 'absolute', left: 1090, top: 120, width: 640, height: 840,
      background: PAPER, boxShadow: '0 2px 0 rgba(32,30,29,0.18)',
      border: `1px solid ${DIV}`, opacity: vis,
      transform: `scale(${scale})`, transformOrigin: '60% 55%',
      padding: '56px 56px 0', boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 17, letterSpacing: '0.08em', color: MUTE, fontWeight: 600, ...MOTION.enter(T, C.case + 1.2, 0.7, 10) }}>
        SUPREME COURT OF SOUTH CAROLINA
      </div>
      <div style={{ height: 2, background: DIV, marginTop: 16, ...MOTION.draw(T, C.case + 1.4, 0.8) }} />
      {/* body texture */}
      <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {lineW.map((w, i) => (
          <div key={i} style={{
            height: 11, width: `${w * 100}%`, background: 'rgba(32,30,29,0.22)',
            ...MOTION.draw(T, C.case + 1.8 + i * 0.25, 0.5),
          }} />
        ))}
      </div>
      {/* filed opinion row — appears in Reversal */}
      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 14, opacity: filed ? 1 : 0, ...MOTION.enter(T, C.rev + 1.2, 0.7, 12) }}>
        <div style={{ width: 12, height: 12, background: RED }} />
        <div style={{ fontSize: 18, letterSpacing: '0.08em', fontWeight: 700, color: RED7 }}>
          OPINION NO. 25093 — FILED MARCH 27, 2000
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 22, fontWeight: 800, color: INK, ...MOTION.enter(T, C.rev + 2.6, 0.7, 12) }}>
        REVERSED — “IMPOSSIBLE”
      </div>
      {/* findings block — the erasure target */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, ...MOTION.enter(T, C.era + 1, 0.7, 10) }}>
          <div style={{ fontSize: 17, letterSpacing: '0.08em', fontWeight: 700, color: RED7, opacity: 1 - goneU * 0.4 }}>
            LAST THREE PARAGRAPHS
          </div>
          <div style={{ fontSize: 17, letterSpacing: '0.08em', fontWeight: 700, color: RED, opacity: goneU }}>
            DELETED
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {findW.map((w, i) => (
            <div key={i} style={{ position: 'relative', height: 11, width: `${w * 100}%` }}>
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(32,30,29,0.3)',
                opacity: (T >= C.era - 2 ? 1 : 0) * (1 - goneU * 0.92),
                ...MOTION.draw(T, C.era - 2 + i * 0.2, 0.5),
              }} />
              <div style={{
                position: 'absolute', left: -6, right: -6, top: -2, height: 15,
                background: RED, opacity: 1 - goneU,
                ...struck(i),
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Piece({ showContact }) {
  const { T, CUES, authoredTotal } = useComposition();
  const C = {
    title: CUES.Title, case: CUES.Case, rev: CUES.Reversal, era: CUES.Erasure,
    q: CUES.Question, th: CUES.Themes, comp: CUES.Comparables, ask: CUES.Ask,
    close: CUES.Close, end: authoredTotal,
  };
  const titleStyle = (size = 72) => ({
    fontWeight: 800, fontSize: size, lineHeight: 1.12, letterSpacing: '-0.015em',
    color: INK, margin: 0,
  });
  const noteStyle = { fontSize: 30, lineHeight: 1.5, color: MUTE, maxWidth: '46ch', margin: 0 };
  const qU = animate({ from: 100, to: 0, start: C.q - 0.7, end: C.q + 0.1, ease: Easing.easeInOutQuart })(T);
  const qOut = animate({ from: 0, to: -100, start: C.th - 0.7, end: C.th + 0.1, ease: Easing.easeInOutQuart })(T);

  return (
    <div data-screen-label={`t=${Math.max(0, Math.floor(T))}s`} style={{
      position: 'absolute', inset: 0, background: BG, color: INK,
      fontFamily: F, overflow: 'hidden',
    }}>
      {/* ── Title ── */}
      <Shot from={C.title} to={C.case + 0.5}>
        <div style={{ position: 'absolute', inset: 0, opacity: fadeIO(T, 0, C.case + 0.5, 0.6, 0.4), transform: `scale(${MOTION.drift(T, 0, C.case, 0.025)})`, transformOrigin: '30% 40%' }}>
          <div style={{ position: 'absolute', left: PAD, right: PAD, top: 96 }}>
            <Kicker T={T} t0={0.4} width={1680}>A feature film · Adapted from the memoir by Michael & David Martin</Kicker>
          </div>
          <div style={{ position: 'absolute', left: PAD, top: 300 }}>
            <h1 style={{ ...titleStyle(148), letterSpacing: '-0.02em', ...MOTION.enter(T, 1.2, 1.1, 40) }}>Clearly<br />Established</h1>
            <p style={{ ...noteStyle, marginTop: 36, maxWidth: '44ch', ...MOTION.enter(T, 2.6, 1) }}>
              The State of South Carolina Supreme Court unanimously said it should have been impossible to convict him. Then he was unable to seek relief due to the court's prevarication — hiding that fact in an erasure.
            </p>
          </div>
          <div style={{ position: 'absolute', left: PAD, bottom: PAD, fontSize: 24, color: MUTE, ...MOTION.enter(T, 3.6, 0.9, 14) }}>
            PITCH · BASED ON A TRUE STORY
          </div>
          <div style={{ position: 'absolute', right: PAD, bottom: PAD, ...MOTION.enter(T, 4.2, 0.9, 14) }}>
            <TruMenLogo size={36} />
          </div>
        </div>
      </Shot>

      {/* the record — persists across Case, Reversal, Erasure */}
      <DocPage T={T} C={C} />

      {/* ── Case ── */}
      <Shot from={C.case} to={C.rev + 0.5}>
        <div style={{ position: 'absolute', left: PAD, top: 96, width: 880, opacity: fadeIO(T, C.case, C.rev + 0.5) }}>
          <Kicker T={T} t0={C.case + 0.1}>01 · The prevarication</Kicker>
          <h2 style={{ ...titleStyle(60), marginTop: 56, ...MOTION.enter(T, C.case + 1, 1) }}>
            A murder the State admitted it could not prove.
          </h2>
          <p style={{ ...noteStyle, fontSize: 28, marginTop: 36, maxWidth: '36ch', ...MOTION.enter(T, C.case + 4, 1) }}>
            “We will probably never know which one of these defendants actually did the killing.” — prosecutor Mark Moyer, in open court.
          </p>
          <p style={{ ...noteStyle, fontSize: 28, marginTop: 22, maxWidth: '36ch', color: INK, ...MOTION.enter(T, C.case + 6.5, 1) }}>
            “You don't know if either of them did.” — Judge Henry Floyd
          </p>
          <p style={{ ...noteStyle, fontSize: 28, marginTop: 22, maxWidth: '36ch', ...MOTION.enter(T, C.case + 9, 1) }}>
            Arrested in 1996 at twenty-six. Convicted in 1997 — sentenced to natural life without parole.
          </p>
          <h3 style={{ ...titleStyle(44), marginTop: 24, ...MOTION.enter(T, C.case + 11, 0.9, 32) }}>
            Three years, eleven months in prison.
          </h3>
          <h3 style={{ ...titleStyle(44), color: RED, marginTop: 10, ...MOTION.enter(T, C.case + 13, 0.9, 32) }}>
            Sixty-plus days of it past what the law allowed.
          </h3>
        </div>
      </Shot>

      {/* ── Reversal ── */}
      <Shot from={C.rev} to={C.era + 0.5}>
        <div style={{ position: 'absolute', left: PAD, top: 96, width: 880, opacity: fadeIO(T, C.rev, C.era + 0.5) }}>
          <Kicker T={T} t0={C.rev + 0.1}>02 · The reversal</Kicker>
          <h2 style={{ ...titleStyle(124), marginTop: 100, ...MOTION.enter(T, C.rev + 0.8, 0.9, 44) }}>Reversed.</h2>
          <h2 style={{ ...titleStyle(96), color: RED, marginTop: 24, maxWidth: '16ch', ...MOTION.enter(T, C.rev + 2.4, 0.9, 44) }}>Impossible to convict.</h2>
          <p style={{ ...noteStyle, marginTop: 48, maxWidth: '32ch', ...MOTION.enter(T, C.rev + 5.5, 1) }}>
            On March 27, 2000, the Supreme Court of South Carolina reversed the conviction — unanimously — holding it should have been impossible to convict him under the State's own theory.
          </p>
        </div>
      </Shot>

      {/* ── Erasure ── */}
      <Shot from={C.era} to={C.q + 0.8}>
        <div style={{ position: 'absolute', left: PAD, top: 96, width: 880, opacity: fadeIO(T, C.era, C.q + 0.8) }}>
          <Kicker T={T} t0={C.era + 0.1}>03 · The erasure</Kicker>
          <h2 style={{ ...titleStyle(84), marginTop: 90, ...MOTION.enter(T, C.era + 0.9, 1) }}>
            Then the findings vanished.
          </h2>
          <p style={{ ...noteStyle, marginTop: 48, maxWidth: '32ch', ...MOTION.enter(T, C.era + 9.5, 1) }}>
            On June 12, 2000, the Court withdrew that opinion and refiled it — with the language that explained his innocence deleted.
          </p>
          <p style={{ ...noteStyle, marginTop: 32, maxWidth: '32ch', color: INK, ...MOTION.enter(T, C.era + 14, 1) }}>
            The reversal stood. The words that explained it did not — a prevarication by erasure, rewriting the Supreme Court's own ruling to shield the State from liability to the man it wronged.
          </p>
        </div>
      </Shot>

      {/* ── Question — the red poster field ── */}
      <div style={{
        position: 'absolute', inset: 0, background: RED, zIndex: 3,
        transform: `translateY(${T < (C.q + C.th) / 2 ? qU : qOut}%)`,
      }}>
        <Shot from={C.q - 0.5} to={C.th + 0.2}>
          <div style={{ position: 'absolute', left: PAD, right: PAD, top: 96 }}>
            <Kicker T={T} t0={C.q + 0.4} color={BG} ruleColor={RED7} width={1680}>Clearly Established</Kicker>
          </div>
          <div style={{ position: 'absolute', left: PAD, top: 380, transform: `scale(${MOTION.drift(T, C.q, C.th, 0.02)})`, transformOrigin: '20% 40%' }}>
            <h2 style={{ ...titleStyle(112), color: BG, maxWidth: '18ch', ...MOTION.enter(T, C.q + 0.9, 1, 36) }}>
              Why would a state erase its own finding of innocence?
            </h2>
            <p style={{ fontSize: 40, lineHeight: 1.4, color: BG, maxWidth: '38ch', margin: 0, marginTop: 48, ...MOTION.enter(T, C.q + 3.5, 1) }}>
              How do you clear a name when the record of innocence has been erased?
            </p>
          </div>
        </Shot>
      </div>

      {/* ── Themes ── */}
      <Shot from={C.th - 0.9} to={C.comp + 0.5}>
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: 96, opacity: fadeIO(T, C.th - 0.9, C.comp + 0.5) }}>
          <Kicker T={T} t0={C.th - 0.6} width={1680}>04 · What it's really about</Kicker>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 48, marginTop: 140 }}>
            {[
              ['01', 'Who controls the record', 'In 1996 there was one copy and the accusers kept it. Then they issued a revised edition where the truth was erased. The truth survives only where it can’t be edited.'],
              ['02', 'The quiet of power', 'No conspiracy, no shout — just an erasure, after hours. How a sovereign State, through acts of prevarication, ensures no liability or accountability to a wronged, innocent citizen.'],
              ['03', 'The cost of being right', 'Attaining relief and due compensation after being wrongfully convicted and over-detained past what the law allowed — with no relief, compensation, or justice.'],
            ].map(([n, h, p], i) => (
              <div key={n} style={MOTION.enter(T, C.th + 0.4 + i * 1.6, 0.9)}>
                <div style={{ height: 2, background: DIV, ...MOTION.draw(T, C.th + 0.4 + i * 1.6, 0.8) }} />
                <div style={{ fontSize: 24, color: RED, fontWeight: 700, marginTop: 28, fontFeatureSettings: '"tnum" 1' }}>{n}</div>
                <h3 style={{ ...titleStyle(40), marginTop: 20 }}>{h}</h3>
                <p style={{ fontSize: 27, lineHeight: 1.5, color: MUTE, marginTop: 20, marginBottom: 0 }}>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </Shot>

      {/* ── Comparables ── */}
      <Shot from={C.comp} to={C.ask + 0.5}>
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: 96, opacity: fadeIO(T, C.comp, C.ask + 0.5) }}>
          <Kicker T={T} t0={C.comp + 0.1} width={1680}>05 · Where this film lives</Kicker>
          <div style={{ marginTop: 130 }}>
            {[
              ['Just Mercy', '2019', 'The north star: a true wrongful-conviction memoir told with dignity and zero melodrama.'],
              ['Loving', '2016', 'Quiet, interior, Oscar-nominated. Restraint reads as prestige.'],
              ['Dark Waters', '2019', 'One person against an institution that edits the truth.'],
              ['When They See Us', '2019', 'The streaming proof point: true injustice, broad reach, awards-season weight.'],
            ].map(([t, y, d], i) => (
              <div key={t} style={MOTION.enter(T, C.comp + 0.8 + i * 1.4, 0.9, 20)}>
                <div style={{ height: 2, background: DIV, ...MOTION.draw(T, C.comp + 0.8 + i * 1.4, 0.8) }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 32, padding: '26px 0 30px' }}>
                  <div style={{ ...titleStyle(44), width: 560 }}>{t}</div>
                  <div style={{ fontSize: 24, color: RED, fontWeight: 700, fontFeatureSettings: '"tnum" 1', width: 90 }}>{y}</div>
                  <div style={{ fontSize: 27, color: MUTE, flex: 1 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shot>

      {/* ── The ask ── */}
      <Shot from={C.ask} to={C.close + 0.5}>
        <div style={{ position: 'absolute', left: PAD, right: PAD, top: 96, opacity: fadeIO(T, C.ask, C.close + 0.5) }}>
          <Kicker T={T} t0={C.ask + 0.1} width={1680}>06 · The ask</Kicker>
          <h2 style={{ ...titleStyle(84), marginTop: 90, ...MOTION.enter(T, C.ask + 0.8, 1) }}>
            What we're looking for.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', columnGap: 48, marginTop: 80 }}>
            {[
              ['01', 'Financing partner', 'Equity and/or a co-financier to close the production budget.'],
              ['02', 'Production home', 'A producer or studio/streamer partner from package to premiere.'],
              ['03', 'Lead attachment', 'An awards-caliber actor for the title role to anchor financing and the campaign.'],
            ].map(([n, h, p], i) => (
              <div key={n} style={MOTION.enter(T, C.ask + 2 + i * 1.5, 0.9)}>
                <div style={{ height: 2, background: DIV, ...MOTION.draw(T, C.ask + 2 + i * 1.5, 0.8) }} />
                <div style={{ fontSize: 24, color: RED, fontWeight: 700, marginTop: 28, fontFeatureSettings: '"tnum" 1' }}>{n}</div>
                <h3 style={{ ...titleStyle(40), marginTop: 20 }}>{h}</h3>
                <p style={{ fontSize: 27, lineHeight: 1.5, color: MUTE, marginTop: 20, marginBottom: 0 }}>{p}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 24, color: MUTE, marginTop: 64, marginBottom: 0, letterSpacing: '0.08em', textTransform: 'uppercase', ...MOTION.enter(T, C.ask + 7, 0.9, 14) }}>
            Status · Completed screenplay · Life rights held by the authors
          </p>
        </div>
      </Shot>

      {/* ── Close ── */}
      <Shot from={C.close} to={C.end + 1}>
        <div style={{ position: 'absolute', inset: 0, opacity: clamp((T - C.close) / 0.3, 0, 1), transform: `scale(${MOTION.drift(T, C.close, C.end, 0.02)})`, transformOrigin: '30% 40%' }}>
          <div style={{ position: 'absolute', left: PAD, right: PAD, top: 96 }}>
            <Kicker T={T} t0={C.close + 0.1} width={1680}>A feature film · Based on a true story</Kicker>
          </div>
          <div style={{ position: 'absolute', left: PAD, top: 360 }}>
            <h2 style={{ ...titleStyle(150), letterSpacing: '-0.02em', ...MOTION.enter(T, C.close + 0.6, 1, 36) }}>Clearly<br />Established</h2>
            <p style={{ ...noteStyle, marginTop: 44, ...MOTION.enter(T, C.close + 1.8, 1) }}>
              The truth does not delete. It stays.
            </p>
          </div>
          {showContact && (
            <div style={{ position: 'absolute', left: PAD, bottom: PAD, display: 'flex', alignItems: 'flex-end', gap: 48, ...MOTION.enter(T, C.close + 2.8, 0.9, 14) }}>
              <TruMenLogo size={44} />
              <div style={{ fontSize: 24, color: MUTE, paddingBottom: 4, whiteSpace: 'nowrap' }}>
                Michael & David Martin · <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Viri Veri</span>
              </div>
            </div>
          )}
        </div>
      </Shot>
    </div>
  );
}

function ClearlyFilm() {
  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#201e1d">
        <Piece showContact={tw.showContact} />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Video" />
        <TweakToggle label="Show contact line" value={tw.showContact} onChange={(v) => setTweak('showContact', v)} />
        <TweakSection label="Editing" />
        <TweakToggle label="Motion editor" value={tw.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </div>
  );
}
window.ClearlyFilm = ClearlyFilm;
