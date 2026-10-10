// @vitest-environment node
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import process from "node:process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type CompleteSectionRequestV1,
  type CompleteSectionResultV1,
  verifyCompleteSectionV1,
} from "../composition/complete-section";
import type { EditorNoteCommand, EditorRevisionV1 } from "../composition/editor-revision";
import { serializeStage7ArpeggiatorAggregateV1 } from "../composition/stage7-arpeggiator-aggregate";
import * as compositionState from "../composition/variation-original-state";
import {
  applyEditorCommandV1,
  createEditorHistoryV1,
  type EditorHistoryV1,
  redoEditorHistoryV1,
  selectedEditorRevisionV1,
  undoEditorHistoryV1,
} from "../editor/editor-history";
import * as generator from "../generators/complete-section";
import * as motifGenerator from "../generators/motif-generator";
import * as aggregateGenerator from "../generators/stage7-arpeggiator-aggregate";
import * as arpDomain from "../music-domain/arpeggiator-policy-generator";
import * as bassDomain from "../music-domain/bass";
import * as harmonyDomain from "../music-domain/harmony";
import {
  generateOriginalArpeggiatorVariationComponentForNodeV1,
  projectOriginalVariationStateForNodeV1,
  serializeOriginalVariationStateForNodeV1,
  verifyOriginalArpeggiatorVariationRequestForNodeV1,
} from "./variation-original-state-node";

function request(): CompleteSectionRequestV1 {
  return {
    schema: "nightdrive.complete-section-request.v1",
    engineVersion: "nightdrive.engine.complete-section.v1",
    generatorVersion: "nightdrive.generator.complete-section.v1",
    composition: {
      schema: "nightdrive.first-playable-composition-request.v1",
      engineVersion: "nightdrive.engine.first-playable-composition.v1",
      generatorVersion: "nightdrive.generator.first-playable-composition.v1",
      profile: { id: "dark-synthwave" },
      harmony: {
        templateId: "degree-0654-natural-minor-v1",
        templateVersion: "v1",
        key: {
          tonic: 0,
          scale: "natural-minor",
        } as CompleteSectionRequestV1["composition"]["harmony"]["key"],
      },
      section: {
        tempo: {
          microsecondsPerQuarter: 500000,
        } as CompleteSectionRequestV1["composition"]["section"]["tempo"],
      },
      intent: { energy: "medium", complexity: "medium" },
      rootSeed: 0,
      bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 } as never, rhythm: "sustained" },
      arpeggiator: {
        range: {
          minMidiPitch: 36,
          maxMidiPitch: 84,
        } as CompleteSectionRequestV1["composition"]["arpeggiator"]["range"],
        profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
        policy: { version: "nightdrive.arpeggiator-policy.v2" },
        seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
        prng: { version: "nightdrive.prng.mulberry32.v1" },
      },
    },
    motif: {
      schema: "nightdrive.motif-generation-request.v1",
      generatorVersion: "nightdrive.generator.motif.v1",
      profile: { version: "nightdrive.genre-profile.motif.v1" },
      policyVersion: "nightdrive.motif-policy.v1",
    },
  };
}
// Independent wire fixture. H+B+A values are transcribed from the accepted
// FIRST_PLAYABLE_CANONICAL_ORACLE.json FP-01, not complete-section generation.
// Its pitches all lie in 36..84, so the narrower request range changes no event.
// Lead is the accepted source-0 medium/medium seed-zero independent plan:
// sparse-4 / upper / chordal / none. MOTIF_MODEL's chord targeting, complete-path
// objective and exact P3 precedence give the literal path below (P1/P3 +5).
// No expected field is read from the production operation or its serializers.
const LITERAL_SECTION = {
  ppq: 960,
  barCount: 8,
  timeSignature: { schema: "nightdrive.time-signature.v1", numerator: 4, denominator: 4 },
  tempo: { schema: "nightdrive.tempo.v1", microsecondsPerQuarter: 500000 },
};
const LITERAL_COMPONENTS = {
  harmony: {
    profile: "dark-synthwave",
    templateId: "degree-0654-natural-minor-v1",
    templateVersion: "v1",
    key: { schema: "nightdrive.key.v1", tonicSemitoneClass: 0, scale: "natural-minor" },
    slots: [
      [0, 0, 0, "minor-triad", 0, [36, 39, 43]],
      [1, 6, 10, "major-triad", 1, [38, 41, 46]],
      [2, 5, 8, "major-triad", 1, [36, 39, 44]],
      [3, 4, 7, "major-triad", 2, [38, 43, 47]],
    ].map(([index, degree, root, quality, inversion, pitches]) => ({
      index,
      degree,
      bars: 2,
      chord: { schema: "nightdrive.chord.v1", rootSemitoneClass: root, quality },
      inversion: { schema: "nightdrive.chord-inversion.v1", memberIndex: inversion },
      voicing: { schema: "nightdrive.chord-voicing.v1", midiPitches: pitches },
    })),
  },
  bass: [48, 46, 44, 43].map((pitch, index) => ({
    pitch,
    startTick: index * 7680,
    durationTicks: 7680,
  })),
  arpeggiator: [
    [55, 51, 43, 39, 36, 51, 48, 43, 36, 55, 51, 43],
    [58, 53, 46, 41, 38, 53, 50, 46, 38, 58, 53, 46],
    [56, 51, 44, 39, 36, 51, 48, 44, 36, 56, 51, 44],
    [59, 55, 47, 43, 38, 55, 50, 47, 38, 59, 55, 47],
  ].flatMap((pitches, phrase) =>
    pitches.map((pitch, index) => {
      const offset = [0, 480, 1440, 1920, 2400, 3360, 3840, 4320, 5280, 5760, 6240, 7200][index];
      if (offset === undefined) throw new Error("Missing literal Arpeggiator onset.");
      return { pitch, startTick: phrase * 7680 + offset, durationTicks: 360 };
    }),
  ),
  lead: {
    plan: {
      policyVersion: "nightdrive.motif-policy.v1",
      profileVersion: "nightdrive.genre-profile.motif.v1",
      rhythmTemplate: "sparse-4",
      registerBand: "upper",
      tensionMode: "chordal",
      phrase4Displacement: "none",
      contourOffsets: [0, 1, 2, 0],
      phraseRoles: [
        "identity",
        "motif-form-repetition",
        "harmony-aware-transposition",
        "contour-preserving-response",
      ],
    },
    events: [75, 79, 79, 75, 74, 77, 77, 74, 80, 84, 84, 80, 79, 79, 79, 74].map(
      (pitch, index) => ({
        pitch,
        startTick: index * 1920,
        durationTicks: 960,
      }),
    ),
  },
};
const LITERAL_PROVENANCE = {
  profile: { id: "dark-synthwave" },
  harmonyTemplate: { id: "degree-0654-natural-minor-v1", version: "v1" },
  bass: { range: { minMidiPitch: 36, maxMidiPitch: 60 }, rhythm: "sustained" },
  arpeggiator: {
    range: { minMidiPitch: 36, maxMidiPitch: 84 },
    profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
    policy: { version: "nightdrive.arpeggiator-policy.v2" },
    seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
    prng: { version: "nightdrive.prng.mulberry32.v1" },
  },
  motif: {
    generatorVersion: "nightdrive.generator.motif.v1",
    profile: { version: "nightdrive.genre-profile.motif.v1" },
    policy: { version: "nightdrive.motif-policy.v1" },
    contour: { version: "nightdrive.motif-contour.v1" },
    rhythm: { version: "nightdrive.motif-rhythm.v1" },
    seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
    prng: { version: "nightdrive.prng.mulberry32.v1" },
    weightedChoice: { version: "nightdrive.weighted-choice.uint32-modulo.v1" },
    componentSeed: 3256624460,
  },
  intent: { energy: "medium", complexity: "medium" },
  rootSeed: 0,
  parent: null,
};
const LITERAL_COMPONENT_HASHES = {
  harmony: "223062477b0382454187436de8444f134d105e671d3f550841aa0babd7eebffb",
  bass: "18152a11fa590ae46f8db418337c080f2561c0e976462e4872137da8291185c7",
  arpeggiator: "9a38c28c2ffee6029c13ccf6645e317457a3dd6041cfd21b5539a780d1313c1f",
  lead: "26a59097472088cc3d26ccb2ca59c246b020316fe392bc6beb2e99dc1c021b1a",
};
const LITERAL_HASH_INPUT = {
  schema: "nightdrive.complete-section-result.v1",
  engineVersion: "nightdrive.engine.complete-section.v1",
  generatorVersion: "nightdrive.generator.complete-section.v1",
  section: LITERAL_SECTION,
  components: LITERAL_COMPONENTS,
  provenance: LITERAL_PROVENANCE,
  componentHashes: LITERAL_COMPONENT_HASHES,
  warnings: [],
};
const LITERAL_RESULT_HASH = "0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1";
const sha256 = (json: string): string =>
  createHash("sha256").update(Buffer.from(json, "utf8")).digest("hex");

// Literal fixture reused unchanged from the accepted complete-section independent
// fixture. It is not obtained by invoking a production generator/serializer.
function wireSource() {
  return structuredClone({ ...LITERAL_HASH_INPUT, resultHash: LITERAL_RESULT_HASH });
}
// Mechanical test-side wire -> accepted value projection, no production parser.
function source(wire = wireSource()) {
  return {
    ...wire,
    section: {
      ppq: wire.section.ppq,
      barCount: wire.section.barCount,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: { microsecondsPerQuarter: wire.section.tempo.microsecondsPerQuarter },
    },
    components: {
      ...wire.components,
      harmony: {
        ...wire.components.harmony,
        key: {
          tonic: wire.components.harmony.key.tonicSemitoneClass,
          scale: wire.components.harmony.key.scale,
        },
        slots: wire.components.harmony.slots.map((slot) => ({
          ...slot,
          chord: { root: slot.chord.rootSemitoneClass, quality: slot.chord.quality },
          inversion: slot.inversion.memberIndex,
          voicing: { midiPitches: slot.voicing.midiPitches },
        })),
      },
    },
  };
}
function frozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) frozen(child);
}

const EXPECTED_START_TICK_ROOT_JSON = [
  '{"schema":"nightdrive.editor-revision.v1","source":{"schema":"nightdrive.complete-section-result.v1","resultHash":"0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1"},"section":{"ppq":960,"barCount":8,"timeSignature":{"numera',
  'tor":4,"denominator":4},"tempo":{"microsecondsPerQuarter":500000},"endTick":30720},"tracks":[{"role":"harmony","notes":[{"id":"note-ac1c9eb06bed77f88dec61692b3af0c81bda84ad492782a7f2c020857901bdcd","pitch":36,"startTick":0,"durationTicks":7',
  '680,"velocity":100},{"id":"note-95f0adb50ce99cce670392eef99aa823b163a70b4c8a588f4f70b2b3a403a4f9","pitch":39,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-16f99431d5cc757bd0d0a0e13568a7f17b1d51e9f027998e04ca61663654f273","p',
  'itch":43,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-68f7f26ed057ebfb9c8ecdb3de293fce0d417a55e7f3da02ee23406902401d9e","pitch":38,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-88e878d68ae66e19ca0809692',
  'e4ecf15c4250d04d64a51a415df45622a75fe65","pitch":41,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-b2bbe7a5ca268e9983c80e6b0842de3900d792a9cfad3a26647f93d5e1e0ef57","pitch":46,"startTick":7680,"durationTicks":7680,"veloci',
  'ty":100},{"id":"note-59e895d00d90fdb39e6da3f1b14ffce7c04b1289475ddd5167bd1c57480e7029","pitch":36,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-bc38b0d452a8056301103f0c2df5d9fa888f9d5bacc3b347cdc5e76f6c6a9443","pitch":3',
  '9,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-77a66c1573544ae87d81718986dc17684c34fa26638f05f73b368f5889105281","pitch":44,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-1dee2ea1dc8f7f8eb74e121a53d',
  '9884097dfb5046d1c6b88619f8f7225d87e66","pitch":38,"startTick":23040,"durationTicks":7680,"velocity":100},{"id":"note-6abba983e4d542bc61950e6e88a4cfee3161144ebe5fa668810e23d57783a544","pitch":43,"startTick":23040,"durationTicks":7680,"veloci',
  'ty":100},{"id":"note-230619546a23728894e7c339b5206a942529ae9a241bfe8a51e88bd4c010a18c","pitch":47,"startTick":23040,"durationTicks":7680,"velocity":100}]},{"role":"bass","notes":[{"id":"note-ccb88aeb3025001af53f2bf73a50e3a68f4c6e1f94d675d46',
  '385464d8a45814f","pitch":48,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-9f4b62fac9836ee0b5e4fcc6585e294173afde0322f3b0ea03b8cabd79ceae45","pitch":46,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-a84f91',
  'e4cf6b2f566e6ffdcc9968b0de74740a9552d258b5d14e8a4e415d935c","pitch":44,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-d27f93130cec9716902c738b203c9ef6bd17aeb3f8b45a4451ff4aa5fc3ac5a9","pitch":43,"startTick":23040,"durati',
  'onTicks":7680,"velocity":100}]},{"role":"arpeggiator","notes":[{"id":"note-2810f4863395a598bdeca12c21e2cf15ad3d6abac45de31e2870c29e905dd9bd","pitch":55,"startTick":0,"durationTicks":360,"velocity":100},{"id":"note-efa6e0f1d8a8f983552aa0537c',
  '4525443c32166880679971c72eaef086fce0ee","pitch":51,"startTick":480,"durationTicks":360,"velocity":100},{"id":"note-e019f8999d37f36fc028339b42567660872303538866f193ab8ef215e05db0d1","pitch":43,"startTick":1440,"durationTicks":360,"velocity":',
  '100},{"id":"note-6c442032c9ee098f997a1092da8c57d82185ffb0ddcd2220b58de5a5b2c84a20","pitch":39,"startTick":1920,"durationTicks":360,"velocity":100},{"id":"note-5ec2aee21342f00ed040bbf29ae794fb5a19d1daf9a24c87bf25b195dcb7e4f5","pitch":36,"sta',
  'rtTick":2400,"durationTicks":360,"velocity":100},{"id":"note-e61bd5e7298eff7c8d98f3539219774845247b2dea3ad47219fa8e9d33b52e0c","pitch":51,"startTick":3360,"durationTicks":360,"velocity":100},{"id":"note-29aaa0a08d68bcf8d83c2065bf426236fd365',
  'e953b64b2898bfcc86d03fbc75a","pitch":48,"startTick":3840,"durationTicks":360,"velocity":100},{"id":"note-500275d8c2ff3c54a723232aecaff796a909d3fb46c9f6ff2909bb2ac084beed","pitch":43,"startTick":4320,"durationTicks":360,"velocity":100},{"id"',
  ':"note-91d2428864b4bce8a8fe6aa872740d77a8a9f0edd7449b5853c23664b39c5395","pitch":36,"startTick":5280,"durationTicks":360,"velocity":100},{"id":"note-938338bf89d1fee529e42f661e949eaa81c3c6a07066b702db57ff67f783a6f8","pitch":55,"startTick":57',
  '60,"durationTicks":360,"velocity":100},{"id":"note-8327d2e5acbd5722ad56f2d54ef89aa193dcdf411cc86fd56ce0cc797f550f2e","pitch":51,"startTick":6240,"durationTicks":360,"velocity":100},{"id":"note-de9c11531d7d09bc787aab17fcdc839f0cc5347186e2891',
  'a665f1b1b67c7affa","pitch":43,"startTick":7200,"durationTicks":360,"velocity":100},{"id":"note-f2a21f6d7f20b556f63be1e97975ebca5f239d8af87e4d9579e4a42247c47a89","pitch":58,"startTick":7680,"durationTicks":360,"velocity":100},{"id":"note-177',
  '1a6e66f896ea8c05974466b9172895059ea2a21a30bb7c2776cd2798367ff","pitch":53,"startTick":8160,"durationTicks":360,"velocity":100},{"id":"note-4eaaff66d5dedf805ac63e9016c9813b76bcf6fdc22cc5a6378b849a6a8aba90","pitch":46,"startTick":9120,"durati',
  'onTicks":360,"velocity":100},{"id":"note-b3d8f0d9264ac4922107167acffc6e245f2bfdfdcc0533f9062649be1d9650f8","pitch":41,"startTick":9600,"durationTicks":360,"velocity":100},{"id":"note-fd875a4a82159a81a1ea06cc6d761a875c3bc28d26bff61f2db64039f',
  '78a7fe6","pitch":38,"startTick":10080,"durationTicks":360,"velocity":100},{"id":"note-1b1ef2cd519d80010c91e880b27b62c735239f9339a8acfc26c487a915edd427","pitch":53,"startTick":11040,"durationTicks":360,"velocity":100},{"id":"note-80c6d470e77',
  '91f0d89963a5d4a52efe9bb6eae11b1f9d90cb393706cd17b9a96","pitch":50,"startTick":11520,"durationTicks":360,"velocity":100},{"id":"note-fbb1573aed7ff60a84b5a4b40a5262a3719b34c79173213e6a766fc1ed015c2d","pitch":46,"startTick":12000,"durationTick',
  's":360,"velocity":100},{"id":"note-afb5cb8200e5299c9d809da01e85c740b4f64ee29cb0a27fc7b6dfa5ad31fa8a","pitch":38,"startTick":12960,"durationTicks":360,"velocity":100},{"id":"note-b510508c825786e2d56f3272e9b8d09b7f4b256940267808bdea0171d946d4',
  '18","pitch":58,"startTick":13440,"durationTicks":360,"velocity":100},{"id":"note-c03a1594ef294facc8b52cdb7536e14c4f76c5c2aac8fc53701670780ecda461","pitch":53,"startTick":13920,"durationTicks":360,"velocity":100},{"id":"note-c77306777ebad482',
  '7dfa4591ca6e0069039fc941e701489b86c6491eaa380727","pitch":46,"startTick":14880,"durationTicks":360,"velocity":100},{"id":"note-64104d8accbd3b1458e8be10816e043dc81d87f7c2abcc46b8b75714ebeae8c9","pitch":56,"startTick":15360,"durationTicks":36',
  '0,"velocity":100},{"id":"note-89abf4e66e1cbc5a93dbf468abc66935275e85d4ca35879c78c7c7223030a1cf","pitch":51,"startTick":15840,"durationTicks":360,"velocity":100},{"id":"note-b3a646780eb83acec680d9deb4376811ca0b632d31533d107361ee698328a028","',
  'pitch":44,"startTick":16800,"durationTicks":360,"velocity":100},{"id":"note-88dc48694cff0dee4c9802d948a92079c3d5c5126c8a7b0ac3b6efbbcd3f1e48","pitch":39,"startTick":17280,"durationTicks":360,"velocity":100},{"id":"note-3b014cbb2d9ca03573a93',
  'd99738986b7c91c9cdbbd3b51434ad330e17bd89418","pitch":36,"startTick":17760,"durationTicks":360,"velocity":100},{"id":"note-72fcce71d7a96b1a82ba9a486ec8e9dc0723f336a6b267b9ef3bf7ffcfab3df6","pitch":51,"startTick":18720,"durationTicks":360,"ve',
  'locity":100},{"id":"note-12ec5d4bc0847f4323ab0e88a30cce9c8d88da68af817113064ca0dced403a72","pitch":48,"startTick":19200,"durationTicks":360,"velocity":100},{"id":"note-9c32f71586a43a82350e34cbc4f1b814faf984a722cb4a65b5868b2fc0bf8614","pitch',
  '":44,"startTick":19680,"durationTicks":360,"velocity":100},{"id":"note-738237ab48a83707a822f2851f5dbabe107692d8cb545cc53424aa0418e0ecd8","pitch":36,"startTick":20640,"durationTicks":360,"velocity":100},{"id":"note-d35a97b9c2f0a765b31a2e361e',
  '264cfa0fcbeabda3eff79fcdd8f1dbd1107df1","pitch":56,"startTick":21120,"durationTicks":360,"velocity":100},{"id":"note-b31d2869f032848377c620930380ab3a7a5e31221a3a58b38b97b22d425c5445","pitch":51,"startTick":21600,"durationTicks":360,"velocit',
  'y":100},{"id":"note-8338af01c8662d15e9d426d69a28b6457d4bff04a7b0a8d15a13e6e9108c2147","pitch":44,"startTick":22560,"durationTicks":360,"velocity":100},{"id":"note-bb7e1e958b9e2c07c834bec2089f652b6c113ed37358db921f0a71ca29f597eb","pitch":59,',
  '"startTick":23040,"durationTicks":360,"velocity":100},{"id":"note-ed0c3987cf95836c63f6dd46fc66dbbbacae65577854f81e7b18d3b6859bb93a","pitch":55,"startTick":23520,"durationTicks":360,"velocity":100},{"id":"note-85b05bb1e06e5e16116cbba63f88d9b',
  '917f7906e2157aa6cf777e886f5712ef6","pitch":47,"startTick":24480,"durationTicks":360,"velocity":100},{"id":"note-080c8a3f5e85746fa6cce10f8b55cf9a0126f93255dbedd0e5065c065bd5d213","pitch":43,"startTick":24960,"durationTicks":360,"velocity":10',
  '0},{"id":"note-027952211a61fac939ec10fd1405f58799b8ac49b46147319660abe18d8daec9","pitch":38,"startTick":25440,"durationTicks":360,"velocity":100},{"id":"note-185485fca6cdb8e408a486075e7511912c7a2f2a81d59a43b7e2d71f0ab83871","pitch":55,"star',
  'tTick":26400,"durationTicks":360,"velocity":100},{"id":"note-3a4d0b2e7c31ba0400d7555f7410742ae91442ff27d5bccb5c854d0986914401","pitch":50,"startTick":26880,"durationTicks":360,"velocity":100},{"id":"note-1989b89967079b3a39636e8728a70b3c53c4',
  '86d9a359f4a16eaef92ee82ede2a","pitch":47,"startTick":27360,"durationTicks":360,"velocity":100},{"id":"note-c883efd82163591875ce60473723f2d2e41c3b9db16aaeb8f7c434591bd922bb","pitch":38,"startTick":28320,"durationTicks":360,"velocity":100},{"',
  'id":"note-f432d8c6babe825410563f4c3d56533ac3c2ef2fb303e0d07741e0a86b1d2018","pitch":59,"startTick":28800,"durationTicks":360,"velocity":100},{"id":"note-4282e06d347f07efd27d1e248a3e1766925e858b89c4aa590656d9b92b0ace2e","pitch":55,"startTick',
  '":29280,"durationTicks":360,"velocity":100},{"id":"note-9be9abb507043c7a64525a872585697521f577bf5943dcc05a2ac9edb7b0b77d","pitch":47,"startTick":30240,"durationTicks":360,"velocity":100}]},{"role":"lead","notes":[{"id":"note-853ab61d8567f96',
  'e2baeaeb213560536422465a0742b27bb4775fd65cfafad12","pitch":75,"startTick":0,"durationTicks":960,"velocity":100},{"id":"note-75336952f6892dec0e5639925cb4c8a53042a44f2d26d758ffc0acab48da0256","pitch":79,"startTick":1920,"durationTicks":960,"v',
  'elocity":100},{"id":"note-10bf8e66b608c601832a0d7300e9dc8ddc79b3912e62ab99f3ee62a6d726070e","pitch":79,"startTick":3840,"durationTicks":960,"velocity":100},{"id":"note-b2e57d31534569a7221590b00c568858a43cebf342891ed553ac909781c32949","pitch',
  '":75,"startTick":5760,"durationTicks":960,"velocity":100},{"id":"note-ca155676c53627d2b26dc4e658a3af7672a679ca65356a0461711d8cd0987e94","pitch":74,"startTick":7680,"durationTicks":960,"velocity":100},{"id":"note-04b0dc531d95015009321aecc641',
  '7905212cab6192e8d664e5078d91958a498b","pitch":77,"startTick":9600,"durationTicks":960,"velocity":100},{"id":"note-359a61bc8734bd8f32c4bcce88297282167c0c8c47b47809b0925173dedaa4a4","pitch":77,"startTick":11520,"durationTicks":960,"velocity":',
  '100},{"id":"note-19be83a377ef7f51540382bfe18b7d6ade71c26cd5fcf59851f260430ab627d3","pitch":74,"startTick":13440,"durationTicks":960,"velocity":100},{"id":"note-cf7e3f10e02a3b897e59cc903c0775024fbc5b1bc8f7c277623fc32a18ac1aae","pitch":80,"st',
  'artTick":15360,"durationTicks":960,"velocity":100},{"id":"note-796ddbb17be634cd4ee244f6460c18b30ff5102b19541c1e634ca380083e0302","pitch":84,"startTick":17280,"durationTicks":960,"velocity":100},{"id":"note-56673b22e001b6258321c78841000120c2',
  '172858843b4007109acbdfa2791475","pitch":84,"startTick":19200,"durationTicks":960,"velocity":100},{"id":"note-aa75e6b6a98279d2f5006efce209001f5de3a00bed54541f5d96f269fea034e5","pitch":80,"startTick":21120,"durationTicks":960,"velocity":100},',
  '{"id":"note-79a5988c212a6bd7cabec30727697e08edc69b20a2ba71bfef23497d95b0db57","pitch":79,"startTick":23040,"durationTicks":960,"velocity":100},{"id":"note-172c93319bc926592b100ad7b2979e7c207a7e74d5d8aa84ddde161d9d1b5d91","pitch":79,"startTi',
  'ck":24960,"durationTicks":960,"velocity":100},{"id":"note-231e345a44e8e3c5d3b20be7cb7c889ea137f390da13802ac93a8f6d34bca3c4","pitch":79,"startTick":26880,"durationTicks":960,"velocity":100},{"id":"note-d6ef221c507b37078303382a750bed292271d70',
  '96bdb642a6c518f2a888d7dad","pitch":74,"startTick":28800,"durationTicks":960,"velocity":100}]}],"parent":null,"command":null,"revisionHash":"f4a0d793b5e20f99df0ddb3ee028cd7b3d2592613a358f7052387d7fe009f404"}',
].join("");

function revisionAt(history: EditorHistoryV1, index: number): EditorRevisionV1 {
  const revision = history.revisions[index];
  if (!revision) throw new Error("Missing test revision");
  return revision;
}
function rootHistory(): EditorHistoryV1 {
  return createEditorHistoryV1(source() as unknown as CompleteSectionResultV1);
}
function apply(history: EditorHistoryV1, command: EditorNoteCommand): EditorHistoryV1 {
  const selected = selectedEditorRevisionV1(history);
  return applyEditorCommandV1(
    history,
    { schema: selected.schema, revisionHash: selected.revisionHash },
    command,
  );
}
function pitchHistory(): EditorHistoryV1 {
  const root = rootHistory();
  const target = root.revisions[0]?.tracks[3]?.notes[0];
  if (!target) throw new Error("Missing literal Lead target");
  return apply(root, {
    schema: "nightdrive.editor-note-command.v1",
    type: "set-note-pitch",
    noteId: target.id,
    expectedPitch: 75,
    pitch: 74,
  });
}
function forgedChild(history: EditorHistoryV1): EditorHistoryV1 {
  const child = history.revisions[1];
  if (!child) throw new Error("Missing child");
  const base = {
    schema: child.schema,
    source: child.source,
    section: child.section,
    tracks: child.tracks.map((track) =>
      track.role !== "lead"
        ? track
        : {
            ...track,
            notes: track.notes.map((note, i) => (i === 0 ? { ...note, pitch: 73 } : note)),
          },
    ),
    parent: child.parent,
    command: child.command,
  };
  const revision = {
    ...base,
    revisionHash: sha256(
      JSON.stringify({ schema: "nightdrive.editor-revision-hash-input.v1", revision: base }),
    ),
  };
  return { ...history, revisions: [revisionAt(history, 0), revision] };
}

// Independent new-domain oracle: literal accepted editor root and explicitly
// constructed pitch child. No production variation serializer/digest/projection.
function literalPitchChild(): EditorRevisionV1 {
  const root = JSON.parse(EXPECTED_START_TICK_ROOT_JSON) as EditorRevisionV1;
  const first = root.tracks[3]?.notes[0];
  if (!first) throw new Error("Missing literal note");
  const base = {
    schema: root.schema,
    source: root.source,
    section: root.section,
    tracks: root.tracks.map((track) =>
      track.role !== "lead"
        ? track
        : {
            role: track.role,
            notes: track.notes.map((note, i) => (i === 0 ? { ...note, pitch: 74 } : note)),
          },
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: {
      schema: "nightdrive.editor-note-command.v1" as const,
      type: "set-note-pitch" as const,
      noteId: first.id,
      expectedPitch: 75,
      pitch: 74,
    },
  };
  return {
    ...base,
    revisionHash: sha256(
      JSON.stringify({
        schema: "nightdrive.editor-revision-hash-input.v1",
        revision: base,
      }),
    ),
  };
}
function independentState(revision: EditorRevisionV1) {
  const tracks = structuredClone(revision.tracks);
  const inputs = tracks.map((track) =>
    JSON.stringify({ schema: "nightdrive.variation-track-hash-input.v1", track }),
  );
  const trackHashes = {
    harmony: sha256(inputs[0] ?? ""),
    bass: sha256(inputs[1] ?? ""),
    arpeggiator: sha256(inputs[2] ?? ""),
    lead: sha256(inputs[3] ?? ""),
  };
  const musicInput = JSON.stringify({
    schema: "nightdrive.variation-music-hash-input.v1",
    section: revision.section,
    tracks: tracks.map((track) => ({
      role: track.role,
      notes: track.notes.map((note) => ({
        pitch: note.pitch,
        startTick: note.startTick,
        durationTicks: note.durationTicks,
        velocity: note.velocity,
      })),
    })),
  });
  const musicHash = sha256(musicInput);
  const base = {
    schema: "nightdrive.variation-state.v1",
    source: revision.source,
    variation: null,
    editor: { schema: revision.schema, revisionHash: revision.revisionHash },
    section: revision.section,
    tracks,
    trackHashes,
    musicHash,
  };
  const stateInput = JSON.stringify({
    schema: "nightdrive.variation-state-hash-input.v1",
    source: base.source,
    variation: null,
    editor: base.editor,
    section: base.section,
    tracks,
    trackHashes,
    musicHash,
  });
  return { state: { ...base, stateHash: sha256(stateInput) }, inputs, musicInput, stateInput };
}
function currentNote(history: EditorHistoryV1) {
  const note = revisionAt(history, history.cursor).tracks[3]?.notes[0];
  if (!note) throw new Error("Missing test Lead note");
  return note;
}
const project = (history: unknown) =>
  projectOriginalVariationStateForNodeV1(source(), request(), history);
const serialize = (history: unknown) =>
  serializeOriginalVariationStateForNodeV1(source(), request(), history);

describe("original alternative combined canonical state", () => {
  const version = Object.getOwnPropertyDescriptor(process.versions, "node");
  afterEach(() => {
    vi.restoreAllMocks();
    if (version) Object.defineProperty(process.versions, "node", version);
  });
  it.each(["root", "pitch-child"])(
    "matches independent %s canonical bytes and all new hash inputs",
    async (kind) => {
      expect(process.versions.node).toBe("24.21.0");
      const history = kind === "root" ? rootHistory() : pitchHistory();
      const literal =
        kind === "root"
          ? (JSON.parse(EXPECTED_START_TICK_ROOT_JSON) as EditorRevisionV1)
          : literalPitchChild();
      const expected = independentState(literal);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const actual = await project(history);
      expect(replay).toHaveBeenCalledTimes(1);
      expect(actual).toEqual(expected.state);
      expect(Object.keys(actual)).toEqual([
        "schema",
        "source",
        "variation",
        "editor",
        "section",
        "tracks",
        "trackHashes",
        "musicHash",
        "stateHash",
      ]);
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected.state));
      expect(Buffer.from(JSON.stringify(actual), "utf8")).toEqual(
        Buffer.from(JSON.stringify(expected.state), "utf8"),
      );
      expect(Object.values(actual.trackHashes)).toEqual(expected.inputs.map(sha256));
      expect(actual.musicHash).toBe(sha256(expected.musicInput));
      expect(actual.stateHash).toBe(sha256(expected.stateInput));
      expect(await serialize(history)).toBe(JSON.stringify(expected.state));
      expect(replay).toHaveBeenCalledTimes(2); // separate top-level entries freshly admit.
      frozen(actual);
    },
  );
  it("preserves exact Undo/Redo state identity and excludes inactive redo from identity", async () => {
    const history = pitchHistory();
    const before = structuredClone(history);
    const root = await project(rootHistory());
    const child = await project(history);
    const undone = undoEditorHistoryV1(history);
    if (!undone) throw new Error("Missing Undo");
    expect(await project(undone)).toEqual(root);
    const redone = redoEditorHistoryV1(undone);
    if (!redone) throw new Error("Missing Redo");
    expect(await project(redone)).toEqual(child);
    expect(history).toEqual(before);
    expect(root.stateHash).not.toBe(child.stateHash);
    expect(root.trackHashes.harmony).toBe(child.trackHashes.harmony);
    expect(root.trackHashes.bass).toBe(child.trackHashes.bass);
    expect(root.trackHashes.arpeggiator).toBe(child.trackHashes.arpeggiator);
  });
  it("carries v1-v7 edited Lead/add/delete values unchanged without affecting protected tracks", async () => {
    let history = pitchHistory();
    let note = currentNote(history);
    const root = await project(rootHistory());
    const commands: EditorNoteCommand[] = [
      {
        schema: "nightdrive.editor-note-command.v2",
        type: "set-note-start-tick",
        noteId: note.id,
        expectedStartTick: 0,
        startTick: 120,
      },
      {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: note.id,
        expectedDurationTicks: 960,
        durationTicks: 480,
      },
      {
        schema: "nightdrive.editor-note-command.v5",
        type: "set-note-position",
        noteId: note.id,
        expectedPitch: 74,
        expectedStartTick: 120,
        pitch: 73,
        startTick: 240,
      },
      {
        schema: "nightdrive.editor-note-command.v7",
        type: "set-note-velocity",
        noteId: note.id,
        expectedVelocity: 100,
        velocity: 80,
      },
      {
        schema: "nightdrive.editor-note-command.v6",
        type: "add-note",
        pitch: 72,
        startTick: 30000,
        durationTicks: 480,
      },
    ];
    for (const command of commands) history = apply(history, command);
    const retainedHistory = history;
    const before = structuredClone(history);
    const state = await project(history);
    expect(state.tracks).toEqual(revisionAt(history, history.cursor).tracks);
    expect(state.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));
    expect(state.source).toEqual(root.source);
    note = currentNote(history);
    expect(note).toMatchObject({ pitch: 73, startTick: 240, durationTicks: 480, velocity: 80 });
    const added = state.tracks[3]?.notes.at(-1);
    if (!added) throw new Error("Missing added note");
    expect(added).toMatchObject({ pitch: 72, startTick: 30000, durationTicks: 480, velocity: 100 });
    history = apply(history, {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: added.id,
    });
    const deleted = await project(history);
    expect(deleted.tracks[3]?.notes.some((n) => n.id === added.id)).toBe(false);
    expect(retainedHistory).toEqual(before);
    expect(state.tracks[3]?.notes.at(-1)).toEqual(added);
    expect(deleted.source.resultHash).toBe(LITERAL_RESULT_HASH);
    frozen(deleted);
  });
  it("includes canonical velocity in hashes without changing any other musical note field", async () => {
    const history = rootHistory();
    const note = currentNote(history);
    const root = await project(history);
    const changed = apply(history, {
      schema: "nightdrive.editor-note-command.v7",
      type: "set-note-velocity",
      noteId: note.id,
      expectedVelocity: 100,
      velocity: 1,
    });
    const result = await project(changed);
    expect(result.musicHash).not.toBe(root.musicHash);
    expect(result.trackHashes.lead).not.toBe(root.trackHashes.lead);
    expect(result.tracks[3]?.notes[0]).toEqual({ ...note, velocity: 1 });
  });
  it.each(["root", "child", "redo"])(
    "rejects self-consistently rehashed forged %s through projection and serialization",
    async (kind) => {
      let history = structuredClone(kind === "root" ? rootHistory() : forgedChild(pitchHistory()));
      if (kind === "root") {
        const old = revisionAt(history, 0);
        const { revisionHash: _hash, ...base } = old;
        const tracks = base.tracks.map((t) =>
          t.role !== "lead"
            ? t
            : { ...t, notes: t.notes.map((n, i) => (i === 0 ? { ...n, pitch: 74 } : n)) },
        );
        const changed = { ...base, tracks };
        history = {
          ...history,
          revisions: [
            {
              ...changed,
              revisionHash: sha256(
                JSON.stringify({
                  schema: "nightdrive.editor-revision-hash-input.v1",
                  revision: changed,
                }),
              ),
            },
          ],
        };
      }
      if (kind === "redo") history = { ...history, cursor: 0 };
      const code = kind === "root" ? "INVALID_EDITOR_SOURCE_BINDING" : "INVALID_EDITOR_LINEAGE";
      await expect(project(history)).rejects.toMatchObject({ code });
      await expect(serialize(history)).rejects.toMatchObject({ code });
    },
  );
  it("cannot serialize a claimed self-consistent state instead of retained source and ancestry", async () => {
    const claimed = independentState(JSON.parse(EXPECTED_START_TICK_ROOT_JSON)).state;
    await expect(serialize(claimed)).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
      field: "history",
    });
  });
  it.each(["projection", "serialization"])(
    "%s rejects forged source before a later invalid history",
    async (kind) => {
      const wire = wireSource();
      wire.section.tempo.microsecondsPerQuarter = 600000;
      // Independently recompute every component/result integrity hash; source
      // structure/hash validation must pass before deterministic admission fails.
      for (const role of ["harmony", "bass", "arpeggiator", "lead"] as const) {
        wire.componentHashes[role] = sha256(
          JSON.stringify({
            schema: `nightdrive.complete-section-${role}-component.v1`,
            section: wire.section,
            component: wire.components[role],
          }),
        );
      }
      const { resultHash: _resultHash, ...base } = wire;
      const forged = { ...base, resultHash: sha256(JSON.stringify(base)) };
      const operation =
        kind === "projection"
          ? projectOriginalVariationStateForNodeV1
          : serializeOriginalVariationStateForNodeV1;
      expect(verifyCompleteSectionV1(source(forged)).resultHash).toBe(forged.resultHash);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      await expect(operation(source(forged), request(), null)).rejects.toMatchObject({
        code: "SOURCE_ADMISSION_MISMATCH",
        field: "source",
      });
      expect(replay).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["accessor", "toJSON", "function", "symbol"])(
    "rejects %s without executing hooks or replay",
    async (kind) => {
      const bad = structuredClone(rootHistory()) as unknown as Record<string | symbol, unknown>;
      const hook = vi.fn();
      if (kind === "accessor")
        Object.defineProperty(bad, "cursor", { get: hook, enumerable: true });
      if (kind === "toJSON") bad.toJSON = hook;
      if (kind === "function") bad.extra = hook;
      if (kind === "symbol") bad[Symbol("bad")] = 1;
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      await expect(project(bad)).rejects.toMatchObject({ code: "INVALID_VARIATION_INPUT" });
      expect(hook).not.toHaveBeenCalled();
      expect(replay).not.toHaveBeenCalled();
    },
  );
  it("snapshots before asynchronous replay and detaches every state object", async () => {
    const history = structuredClone(pitchHistory());
    const original = structuredClone(history);
    const real = generator.generateCompleteSectionV1;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementation(async (input) => {
      await gate;
      return real(input);
    });
    const pending = project(history);
    Reflect.set(history, "cursor", 0);
    release();
    const result = await pending;
    expect(result).toEqual(independentState(literalPitchChild()).state);
    expect(result.tracks).not.toBe(original.revisions[1]?.tracks);
    frozen(result);
  });
  it("propagates delegated failure unchanged with no partial state or serialized output", async () => {
    const failure = new Error("synthetic replay failure");
    const installed = vi.fn();
    vi.spyOn(generator, "generateCompleteSectionV1").mockRejectedValue(failure);
    const pending = project(rootHistory());
    void pending.then(installed, () => undefined);
    await expect(pending).rejects.toBe(failure);
    expect(installed).not.toHaveBeenCalled();
    await expect(serialize(rootHistory())).rejects.toBe(failure);
  });
  it("does not export a raw revision constructor and proves direct canonical projection", async () => {
    expect(Object.keys(compositionState).sort()).toEqual([
      "ARPEGGIATOR_VARIATION_REQUEST_SCHEMA_V1",
      "VARIATION_STATE_SCHEMA_V1",
      "VariationComponentValueError",
      "VariationRequestValueError",
      "generateOriginalArpeggiatorVariationComponentV1",
      "projectOriginalVariationStateV1",
      "verifyOriginalArpeggiatorVariationRequestV1",
    ]);
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const actual = await compositionState.projectOriginalVariationStateV1(
      source(),
      request(),
      pitchHistory(),
    );
    expect(actual).toEqual(independentState(literalPitchChild()).state);
    expect(replay).toHaveBeenCalledTimes(1);
    frozen(actual);
  });
  it("direct canonical construction rejects forged ancestry, standalone revisions and descriptor hooks", async () => {
    await expect(
      compositionState.projectOriginalVariationStateV1(
        source(),
        request(),
        forgedChild(pitchHistory()),
      ),
    ).rejects.toMatchObject({ code: "INVALID_EDITOR_LINEAGE" });
    await expect(
      compositionState.projectOriginalVariationStateV1(source(), request(), literalPitchChild()),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_LINEAGE", field: "history" });
    const hook = vi.fn();
    const bad = Object.defineProperty({}, "cursor", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(
      compositionState.projectOriginalVariationStateV1(source(), request(), bad),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_INPUT" });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });
  it("guards exact Node before descriptors for every exported authoritative operation", async () => {
    Object.defineProperty(process.versions, "node", { value: "24.20.0", configurable: true });
    const hook = vi.fn();
    const bad = Object.defineProperty({}, "source", { get: hook });
    for (const op of [
      compositionState.projectOriginalVariationStateV1,
      projectOriginalVariationStateForNodeV1,
      serializeOriginalVariationStateForNodeV1,
    ])
      await expect(op(bad, bad, bad)).rejects.toThrow("requires Node 24.21.0");
    expect(hook).not.toHaveBeenCalled();
  });
});

describe("original-parent variation request preflight", () => {
  const literalParent = () => ({
    schema: "nightdrive.variation-state.v1",
    stateHash: independentState(literalPitchChild()).state.stateHash,
  });
  const proposal = (seed: unknown = 17) => ({
    schema: "nightdrive.arpeggiator-variation-request.v1",
    parent: literalParent(),
    rootSeed: seed,
  });
  const verify = (request: unknown, history: unknown = pitchHistory()) =>
    verifyOriginalArpeggiatorVariationRequestForNodeV1(
      source(),
      requestOriginal(),
      history,
      request,
    );
  // Keep original generation request explicit and independent of variation seed.
  const requestOriginal = request;
  afterEach(() => vi.restoreAllMocks());

  it.each([0, 17, 4294967295, -0])(
    "accepts explicit uint32 %s with one fresh admission per entry",
    async (seed) => {
      const input = proposal(seed);
      const before = structuredClone(input);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      const result = await verify(input);
      expect(JSON.stringify(result)).toBe(
        JSON.stringify({ ...before, rootSeed: seed === 0 ? 0 : seed }),
      );
      expect(Object.is(result.rootSeed, -0)).toBe(false);
      expect(result).not.toBe(input);
      expect(result.parent).not.toBe(input.parent);
      frozen(result);
      expect(input).toEqual(before);
      expect(replay).toHaveBeenCalledTimes(1);
      expect(target).not.toHaveBeenCalled();
      await compositionState.verifyOriginalArpeggiatorVariationRequestV1(
        source(),
        requestOriginal(),
        pitchHistory(),
        input,
      );
      expect(replay).toHaveBeenCalledTimes(2);
      expect(target).not.toHaveBeenCalled();
    },
  );
  it.each([-1, 4294967296, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity, "17", null])(
    "rejects invalid explicit seed %s without target generation or input changes",
    async (seed) => {
      const history = pitchHistory();
      const before = structuredClone(history);
      const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      await expect(verify(proposal(seed), history)).rejects.toMatchObject({
        code: "INVALID_VARIATION_SEED",
        field: "request.rootSeed",
      });
      expect(history).toEqual(before);
      expect(target).not.toHaveBeenCalled();
    },
  );
  it.each([
    { value: null, code: "INVALID_VARIATION_INPUT", field: "request" },
    {
      value: { schema: "nightdrive.arpeggiator-variation-request.v1", parent: literalParent() },
      code: "INVALID_VARIATION_INPUT",
      field: "request",
    },
    {
      value: {
        parent: literalParent(),
        schema: "nightdrive.arpeggiator-variation-request.v1",
        rootSeed: 17,
      },
      code: "INVALID_VARIATION_INPUT",
      field: "request",
    },
    { value: { ...proposal(), extra: 1 }, code: "INVALID_VARIATION_INPUT", field: "request" },
    {
      value: { ...proposal(), schema: "unsupported" },
      code: "UNSUPPORTED_VARIATION_SCHEMA",
      field: "request.schema",
    },
    {
      value: { ...proposal(), parent: null },
      code: "INVALID_VARIATION_PARENT",
      field: "request.parent",
    },
    {
      value: {
        ...proposal(),
        parent: { stateHash: literalParent().stateHash, schema: "nightdrive.variation-state.v1" },
      },
      code: "INVALID_VARIATION_PARENT",
      field: "request.parent",
    },
    {
      value: { ...proposal(), parent: { ...literalParent(), stateHash: "BAD" } },
      code: "INVALID_VARIATION_PARENT",
      field: "request.parent",
    },
  ])("rejects exact envelope $code at $field", async ({ value, code, field }) => {
    await expect(verify(value)).rejects.toMatchObject({ code, field });
  });
  it("rejects an explicit undefined seed without inventing a default", async () => {
    await expect(verify({ ...proposal(), rootSeed: undefined })).rejects.toMatchObject({
      code: "INVALID_VARIATION_SEED",
      field: "request.rootSeed",
    });
  });
  it("rejects stale parent before invalid seed, and editor lineage before parent semantics", async () => {
    const stale = { ...proposal(-1), parent: { ...literalParent(), stateHash: "0".repeat(64) } };
    await expect(verify(stale)).rejects.toMatchObject({ code: "STALE_VARIATION_PARENT" });
    await expect(verify(stale, forgedChild(pitchHistory()))).rejects.toMatchObject({
      code: "INVALID_EDITOR_LINEAGE",
    });
  });
  it("source replay mismatch precedes request/seed semantics", async () => {
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const mismatch = requestOriginal();
    Reflect.set(mismatch.composition, "rootSeed", 1);
    await expect(
      verifyOriginalArpeggiatorVariationRequestForNodeV1(
        source(),
        mismatch,
        pitchHistory(),
        proposal(-1),
      ),
    ).rejects.toMatchObject({ code: "SOURCE_ADMISSION_MISMATCH" });
    expect(replay).toHaveBeenCalledTimes(1);
  });
  it.each(["getter", "toJSON", "function", "symbol"])(
    "rejects %s without hooks or replay",
    async (kind) => {
      const input = proposal() as Record<string | symbol, unknown>;
      const hook = vi.fn();
      if (kind === "getter")
        Object.defineProperty(input, "rootSeed", { get: hook, enumerable: true });
      if (kind === "toJSON") input.toJSON = hook;
      if (kind === "function") input.extra = hook;
      if (kind === "symbol") input[Symbol("bad")] = 1;
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      await expect(verify(input)).rejects.toMatchObject({ code: "INVALID_VARIATION_INPUT" });
      expect(hook).not.toHaveBeenCalled();
      expect(replay).not.toHaveBeenCalled();
    },
  );
  it("snapshots proposal before asynchronous replay and fails closed on delegated rejection", async () => {
    const input = proposal();
    const real = generator.generateCompleteSectionV1;
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const replay = vi
      .spyOn(generator, "generateCompleteSectionV1")
      .mockImplementation(async (value) => {
        await gate;
        return real(value);
      });
    const pending = verify(input);
    input.rootSeed = 23;
    input.parent.stateHash = "0".repeat(64);
    release();
    expect((await pending).rootSeed).toBe(17);
    const failure = new Error("synthetic replay failure");
    replay.mockRejectedValueOnce(failure);
    const installed = vi.fn();
    const rejected = verify(proposal());
    void rejected.then(installed, () => undefined);
    await expect(rejected).rejects.toBe(failure);
    expect(installed).not.toHaveBeenCalled();
  });
  it("guards Node before all input descriptors on canonical and Node paths", async () => {
    Object.defineProperty(process.versions, "node", { value: "24.20.0", configurable: true });
    const hook = vi.fn();
    const bad = Object.defineProperty({}, "schema", { get: hook });
    for (const operation of [
      compositionState.verifyOriginalArpeggiatorVariationRequestV1,
      verifyOriginalArpeggiatorVariationRequestForNodeV1,
    ])
      await expect(operation(bad, bad, bad, bad)).rejects.toThrow("requires Node 24.21.0");
    expect(hook).not.toHaveBeenCalled();
    Object.defineProperty(process.versions, "node", { value: "24.21.0", configurable: true });
  });
});

describe("original-parent accepted Arpeggiator generation bridge", () => {
  const version = Object.getOwnPropertyDescriptor(process.versions, "node");
  afterEach(() => {
    vi.restoreAllMocks();
    if (version) Object.defineProperty(process.versions, "node", version);
  });
  const proposal = (seed = 0) => ({
    schema: "nightdrive.arpeggiator-variation-request.v1",
    parent: {
      schema: "nightdrive.variation-state.v1",
      stateHash: independentState(literalPitchChild()).state.stateHash,
    },
    rootSeed: seed,
  });
  const generate = (input: unknown = proposal(), history: unknown = pitchHistory()) =>
    generateOriginalArpeggiatorVariationComponentForNodeV1(source(), request(), history, input);
  function independentAggregate() {
    const hash = (v: unknown) =>
      createHash("sha256").update(JSON.stringify(v), "utf8").digest("hex");
    const partial = {
      schema: "nightdrive.stage7-arpeggiator-aggregate.v1",
      engineVersion: "nightdrive.engine.stage7-aggregate.v1",
      generatorVersion: "nightdrive.generator.stage7-arpeggiator.v1",
      section: LITERAL_SECTION,
      components: {
        harmony: LITERAL_COMPONENTS.harmony,
        arpeggiator: LITERAL_COMPONENTS.arpeggiator,
      },
      provenance: {
        profile: { id: "dark-synthwave", version: "nightdrive.genre-profile.arpeggiator.v2" },
        policy: { version: "nightdrive.arpeggiator-policy.v2" },
        seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
        prng: { version: "nightdrive.prng.mulberry32.v1" },
        rootSeed: 0,
        normalizedInputs: {
          intent: { energy: "medium", complexity: "medium" },
          range: { minMidiPitch: 36, maxMidiPitch: 84 },
        },
        parent: null,
      },
      componentHashes: {
        harmony: hash({
          schema: "nightdrive.stage7-harmony-component.v1",
          section: LITERAL_SECTION,
          harmony: LITERAL_COMPONENTS.harmony,
        }),
        arpeggiator: hash({
          schema: "nightdrive.stage7-arpeggiator-component.v1",
          section: LITERAL_SECTION,
          events: LITERAL_COMPONENTS.arpeggiator,
        }),
      },
      warnings: [],
    };
    return { ...partial, resultHash: hash(partial) };
  }
  it("matches accepted independent same-seed literal events, canonical UTF8 and standard SHA hashes", async () => {
    const actual = await generate();
    const expected = JSON.stringify(independentAggregate());
    const canonical = serializeStage7ArpeggiatorAggregateV1(actual);
    expect(canonical).toBe(expected);
    expect(Buffer.from(canonical)).toEqual(Buffer.from(expected));
    expect(actual.componentHashes).toEqual(independentAggregate().componentHashes);
    expect(actual.resultHash).toBe(independentAggregate().resultHash);
    frozen(actual);
  });
  it.each([17, 4294967295])(
    "forwards only explicit seed %s and exact original source configuration",
    async (seed) => {
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      const harmony = vi.spyOn(harmonyDomain, "realizeHarmonyProgression");
      const bass = vi.spyOn(bassDomain, "generateBassEvents");
      const motif = vi.spyOn(motifGenerator, "generateMotifV1");
      const arp = vi.spyOn(arpDomain, "generateArpEventsWithPolicyV2");
      const history = pitchHistory();
      const before = structuredClone(history);
      const result = await generate(proposal(seed), history);
      expect(replay).toHaveBeenCalledTimes(1);
      expect(target).toHaveBeenCalledTimes(1);
      expect(harmony).toHaveBeenCalledTimes(1);
      expect(bass).toHaveBeenCalledTimes(1);
      expect(motif).toHaveBeenCalledTimes(1);
      expect(arp).toHaveBeenCalledTimes(2);
      expect(arp.mock.calls.map(([r]) => r.rootSeed)).toEqual([0, seed]);
      expect(target.mock.calls[0]?.[0]).toEqual({
        schema: "nightdrive.stage7-arpeggiator-aggregate.v1",
        engineVersion: "nightdrive.engine.stage7-aggregate.v1",
        generatorVersion: "nightdrive.generator.stage7-arpeggiator.v1",
        parent: null,
        tempo: { microsecondsPerQuarter: 500000 },
        progression: source().components.harmony,
        range: { minMidiPitch: 36, maxMidiPitch: 84 },
        intent: { energy: "medium", complexity: "medium" },
        profile: { id: "dark-synthwave", version: "nightdrive.genre-profile.arpeggiator.v2" },
        policy: { version: "nightdrive.arpeggiator-policy.v2" },
        seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
        prng: { version: "nightdrive.prng.mulberry32.v1" },
        rootSeed: seed,
      });
      expect(result.provenance.rootSeed).toBe(seed);
      expect(result.components.harmony).toEqual(source().components.harmony);
      expect(history).toEqual(before);
      expect(selectedEditorRevisionV1(history).tracks[3]?.notes[0]?.pitch).toBe(74);
      frozen(result);
    },
  );
  it("freshly admits every direct canonical and Node invocation; deterministic output is detached", async () => {
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    const a = await generate(proposal(17));
    const b = await compositionState.generateOriginalArpeggiatorVariationComponentV1(
      source(),
      request(),
      pitchHistory(),
      proposal(17),
    );
    expect(serializeStage7ArpeggiatorAggregateV1(a)).toBe(serializeStage7ArpeggiatorAggregateV1(b));
    expect(a).not.toBe(b);
    expect(replay).toHaveBeenCalledTimes(2);
    expect(target).toHaveBeenCalledTimes(2);
  });
  it("finishes source/history/request validation before any target dispatch", async () => {
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    await expect(generate(proposal(), forgedChild(pitchHistory()))).rejects.toMatchObject({
      code: "INVALID_EDITOR_LINEAGE",
    });
    await expect(
      generate({
        ...proposal(),
        parent: { schema: "nightdrive.variation-state.v1", stateHash: "0".repeat(64) },
        rootSeed: -1,
      }),
    ).rejects.toMatchObject({ code: "STALE_VARIATION_PARENT" });
    await expect(generate({ ...proposal(), rootSeed: -1 })).rejects.toMatchObject({
      code: "INVALID_VARIATION_SEED",
    });
    expect(target).not.toHaveBeenCalled();
  });
  it("snapshots the proposal/history before awaiting admission", async () => {
    const original = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementation(async (r) => {
      await gate;
      return original(r);
    });
    const input = proposal(17);
    const history = pitchHistory();
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    const pending = generate(input, history);
    input.rootSeed = 999;
    Reflect.set(history, "cursor", 0);
    release?.();
    const result = await pending;
    expect(result.provenance.rootSeed).toBe(17);
    expect(target.mock.calls[0]?.[0].rootSeed).toBe(17);
  });
  it.each(["replay", "target"])(
    "propagates %s failure unchanged with no returned aggregate",
    async (which) => {
      const failure = new Error("delegated test failure");
      const install = vi.fn();
      const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      if (which === "replay")
        vi.spyOn(generator, "generateCompleteSectionV1").mockRejectedValue(failure);
      else target.mockRejectedValue(failure);
      const history = pitchHistory();
      const before = structuredClone(history);
      const pending = generate(proposal(), history);
      void pending.then(install, () => undefined);
      await expect(pending).rejects.toBe(failure);
      expect(install).not.toHaveBeenCalled();
      expect(history).toEqual(before);
      expect(target).toHaveBeenCalledTimes(which === "replay" ? 0 : 1);
    },
  );
  it.each(["digest", "seed", "tempo"])(
    "rejects forged delegated %s output instead of repairing or returning it",
    async (kind) => {
      const original = aggregateGenerator.generateStage7ArpeggiatorAggregateV1;
      vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1").mockImplementation(
        async (r) => {
          if (kind === "seed") return original({ ...r, rootSeed: r.rootSeed + 1 });
          if (kind === "tempo")
            return original({ ...r, tempo: { microsecondsPerQuarter: 600000 } as typeof r.tempo });
          return { ...(await original(r)), resultHash: "0".repeat(64) };
        },
      );
      await expect(generate()).rejects.toMatchObject({
        code:
          kind === "digest"
            ? "AGGREGATE_HASH_MISMATCH"
            : kind === "tempo"
              ? "VARIATION_LOCK_MISMATCH"
              : "VARIATION_HASH_MISMATCH",
      });
    },
  );
  it("rejects descriptors without observing hooks or generation", async () => {
    const hook = vi.fn();
    const input = Object.defineProperty(proposal(), "rootSeed", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    await expect(generate(input)).rejects.toMatchObject({ code: "INVALID_VARIATION_INPUT" });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
    expect(target).not.toHaveBeenCalled();
  });
  it("enforces exact runtime before observing inputs on both exported paths", async () => {
    Object.defineProperty(process.versions, "node", { value: "24.20.0", configurable: true });
    const hook = vi.fn();
    const bad = Object.defineProperty({}, "source", { get: hook });
    for (const op of [compositionState.generateOriginalArpeggiatorVariationComponentV1])
      await expect(op(bad, bad, bad, bad)).rejects.toThrow("requires Node 24.21.0");
    expect(hook).not.toHaveBeenCalled();
  });
});
