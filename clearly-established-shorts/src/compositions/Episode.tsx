import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Sequence,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Captions } from '../components/Captions.js';
import { CompanyMark, WrittenBy } from '../components/EndCard.js';
import { FactCard } from '../components/FactCard.js';
import { GateSlate, Watermark } from '../components/Gate.js';
import { Grain } from '../components/Grain.js';
import { Rig } from '../components/Rig.js';
import { TitleLockup } from '../components/TitleLockup.js';
import { loadBrandFonts, serifStack } from '../lib/fonts.js';
import { safeBox } from '../lib/layout.js';
import { visemeAt } from '../lib/lipsync-browser.js';
import { blinkOpenness } from '../lib/rig.js';
import { placement, poseFor, sceneAt } from '../lib/stage.js';
import type { EpisodeRenderData, RootProps } from '../lib/types.js';
import { SET_COMPONENTS } from '../sets/index.js';

const MAGENTA = '#FF00FF';

export const Episode: React.FC<RootProps> = (props) => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    loadBrandFonts().then(() => continueRender(handle));
  }, [handle]);
  if (props.kind === 'empty') return <Empty />;
  return <EpisodeBody data={props} />;
};

const Empty: React.FC = () => (
  <AbsoluteFill
    style={{
      background: '#0B1F3A',
      color: '#F3EBDD',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Gelasio, Georgia, serif',
      fontSize: 40,
      textAlign: 'center',
      padding: 80,
    }}
  >
    <div>No episode loaded.</div>
    <div style={{ fontSize: 28, marginTop: 30, opacity: 0.8 }}>
      Run `npm run preview -- --episode 001` to open one in the Studio.
    </div>
  </AbsoluteFill>
);

const EpisodeBody: React.FC<{ data: EpisodeRenderData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { brand, spec, gate, typeface } = data;
  const box = safeBox(data.safeZone, width, height);
  const probe = data.probeMask === true;
  const episodeFrame = frame - data.slateFrames;
  const t = episodeFrame / fps;
  const label = `No. ${spec.id} · ${spec.title}`;

  return (
    <AbsoluteFill
      style={{
        background: probe ? '#000000' : brand.palette.navy,
        fontFamily: serifStack(typeface),
      }}
    >
      {data.slateFrames > 0 && !probe ? (
        <Sequence durationInFrames={data.slateFrames} name="INTERNAL slate">
          <GateSlate
            brand={brand}
            typeface={typeface}
            episodeLabel={label}
            reasons={gate.reasons}
          />
        </Sequence>
      ) : null}
      <Sequence from={data.slateFrames} name="Episode">
        <Scene data={data} t={Math.max(0, t)} box={box} probe={probe} />
      </Sequence>
      {!gate.clean && !probe ? (
        <Watermark brand={brand} typeface={typeface} top={box.y + 16} left={box.x} />
      ) : null}
    </AbsoluteFill>
  );
};

const Scene: React.FC<{
  data: EpisodeRenderData;
  t: number;
  box: ReturnType<typeof safeBox>;
  probe: boolean;
}> = ({ data, t, box, probe }) => {
  const { width, height } = useVideoConfig();
  const { brand, series, spec, typeface, endCard } = data;
  const scene = sceneAt(t, data.beats);
  const SetComponent = SET_COMPONENTS[spec.set];
  const viseme = visemeAt(data.lipsync.cues, t);

  const titleCard = data.cards.find((c) => c.type === 'title');
  const factCard = [...data.cards]
    .reverse()
    .find((c) => c.type === 'fact' && c.seconds <= t && t < endCard.titleStart);
  const inTitle = t >= endCard.titleStart && t < endCard.writtenByStart;
  const inWrittenBy = t >= endCard.writtenByStart && t < endCard.companyStart;
  const inCompany = t >= endCard.companyStart;
  const inEndCard = inTitle || inWrittenBy || inCompany;
  const plate = inEndCard ? null : (data.captions.find((p) => t >= p.start && t < p.end) ?? null);

  const sorted = spec.cast
    .map((member, i) => ({ member, i, place: placement(member, width, height) }))
    .sort((a, b) => a.place.z - b.place.z);

  return (
    <AbsoluteFill>
      {!probe && !inEndCard ? (
        <AbsoluteFill
          style={{
            transform: `scale(${scene.camera.scale}) translate(${scene.camera.x}px, ${scene.camera.y}px)`,
            transformOrigin: '50% 60%',
          }}
        >
          <SetComponent
            seconds={t}
            dim={scene.room.dim}
            variant={scene.room.variant}
            width={width}
            height={height}
            brand={brand}
          />
          {sorted.map(({ member, i, place }) => {
            const bundle = data.rigs[member.rig];
            if (!bundle) return null;
            const isLead = member.role === 'lead';
            const s = isLead ? scene.lead : null;
            const state = isLead
              ? {
                  pose: scene.lead.pose,
                  expression: scene.lead.expression,
                  viseme,
                  blink: blinkOpenness(t, bundle.config.blink),
                  seconds: t,
                  idle: scene.lead.idle,
                  headTurn: scene.lead.headTurn,
                }
              : {
                  pose: scene.room.pose,
                  expression: 'level',
                  viseme: 'X' as const,
                  blink: 1,
                  seconds: t + i * 1.7,
                  idle: scene.room.idle,
                  headTurn: scene.room.bob * (i % 2 ? 1 : -1),
                };
            const poseOverride = poseFor(
              bundle.config,
              state.pose,
              isLead ? scene.lead.poseBlend : scene.room.poseBlend,
            );
            return (
              <React.Fragment key={`${member.rig}-${i}`}>
                <Rig
                  bundle={bundle}
                  instanceId={`${i}`}
                  state={state}
                  poseOverride={poseOverride}
                  heightPx={place.heightPx}
                  x={place.x}
                  bottom={place.bottom}
                  facing={place.facing}
                  opacity={s?.opacity ?? 1}
                  offsetX={s?.offsetX ?? 0}
                  offsetY={s?.offsetY ?? 0}
                  scale={s?.scale ?? 1}
                />
                {member.label && place.labelY ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: place.x - 200,
                      width: 400,
                      top: place.labelY,
                      textAlign: 'center',
                      color: brand.palette.cream,
                      fontSize: 30,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      opacity: 0.85 * scene.room.dim,
                    }}
                  >
                    {member.label}
                  </div>
                ) : null}
              </React.Fragment>
            );
          })}
          <Grain
            opacity={brand.look.grainOpacity}
            seed={brand.look.grainSeed}
            width={width}
            height={height}
          />
        </AbsoluteFill>
      ) : null}

      {factCard && factCard.text ? (
        <FactCard
          brand={brand}
          typeface={typeface}
          text={factCard.text}
          box={box}
          progress={(t - factCard.seconds) / 0.35}
          probe={probe}
        />
      ) : null}
      {!probe && inTitle && titleCard ? (
        <TitleLockup
          brand={brand}
          series={series}
          typeface={typeface}
          episodeTitle={spec.title}
          episodeId={spec.id}
          progress={(t - endCard.titleStart) / 0.35}
        />
      ) : null}
      {!probe && inWrittenBy ? (
        <WrittenBy
          brand={brand}
          series={series}
          typeface={typeface}
          progress={(t - endCard.writtenByStart) / 0.3}
        />
      ) : null}
      {!probe && inCompany ? (
        <CompanyMark
          brand={brand}
          series={series}
          lockupAvailable={data.lockup.available}
          progress={(t - endCard.companyStart) / 0.3}
        />
      ) : null}
      {probe && inEndCard ? (
        <div
          data-probe="endcard"
          style={{
            position: 'absolute',
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            background: MAGENTA,
            opacity: 0,
          }}
        />
      ) : null}
      <Captions
        plate={plate}
        seconds={t}
        brand={brand}
        typeface={typeface}
        box={box}
        probe={probe}
      />
      {!probe && inEndCard ? (
        <Grain
          opacity={brand.look.grainOpacity * 0.6}
          seed={brand.look.grainSeed}
          width={width}
          height={height}
        />
      ) : null}
    </AbsoluteFill>
  );
};
