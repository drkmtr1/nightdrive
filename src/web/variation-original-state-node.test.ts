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
import * as attemptComposition from "../composition/variation-attempt";
import * as compositionState from "../composition/variation-original-state";
import * as editorBoundary from "../editor/editor-history";
import {
  applyEditorCommandV1,
  createEditorHistoryV1,
  type EditorHistoryV1,
  redoEditorHistoryV1,
  selectedEditorRevisionV1,
  undoEditorHistoryV1,
} from "../editor/editor-history";
import * as digestAdapter from "../generators/adapters/stage7-digest";
import * as generator from "../generators/complete-section";
import * as motifGenerator from "../generators/motif-generator";
import * as aggregateGenerator from "../generators/stage7-arpeggiator-aggregate";
import * as arpDomain from "../music-domain/arpeggiator-policy-generator";
import * as bassDomain from "../music-domain/bass";
import * as harmonyDomain from "../music-domain/harmony";
import {
  createRetainedArpeggiatorVariationApplicationForNodeV1,
  editRetainedVariationApplicationForNodeV1,
  projectRetainedVariationApplicationForNodeV1,
  projectRetainedVariationPreviewForNodeV1,
  redoRetainedVariationApplicationForNodeV1,
  selectRetainedVariationApplicationForNodeV1,
  undoRetainedVariationApplicationForNodeV1,
} from "./variation-application-node";
import {
  serializeVariationAttemptForNodeV1,
  verifyVariationAttemptForNodeV1,
} from "./variation-attempt-node";
import { verifyVariationCollectionForNodeV1 } from "./variation-collection-node";
import {
  generateOriginalArpeggiatorVariationComponentForNodeV1,
  generateOriginalArpeggiatorVariationRootForNodeV1,
  generateVariationParentArpeggiatorRootForNodeV1,
  projectOriginalVariationStateForNodeV1,
  serializeOriginalArpeggiatorVariationRootForNodeV1,
  serializeOriginalVariationStateForNodeV1,
  verifyArpeggiatorVariationAncestryForNodeV1,
  verifyOriginalArpeggiatorVariationRequestForNodeV1,
  verifyOriginalArpeggiatorVariationRootForNodeV1,
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
    if (!undone) throw new Error("Missing Undo result");
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
      "ARPEGGIATOR_VARIATION_SCHEMA_V1",
      "VARIATION_ATTEMPT_SCHEMA_V1",
      "VARIATION_CREATION_PROOF_SCHEMA_V1",
      "VARIATION_STATE_SCHEMA_V1",
      "VariationAttemptValueError",
      "VariationCollectionValueError",
      "VariationComponentValueError",
      "VariationRequestValueError",
      "VariationRootValueError",
      "createRetainedArpeggiatorAlternativeV1",
      "editRetainedVariationContextV1",
      "generateOriginalArpeggiatorVariationComponentV1",
      "generateOriginalArpeggiatorVariationRootV1",
      "generateVariationParentArpeggiatorRootV1",
      "projectOriginalVariationStateV1",
      "projectRetainedVariationContextV1",
      "redoRetainedVariationContextV1",
      "selectRetainedVariationContextV1",
      "serializeOriginalArpeggiatorVariationRootV1",
      "serializeVariationAttemptV1",
      "undoRetainedVariationContextV1",
      "verifyArpeggiatorVariationAncestryV1",
      "verifyOriginalArpeggiatorVariationRequestV1",
      "verifyOriginalArpeggiatorVariationRootV1",
      "verifyVariationAttemptV1",
      "verifyVariationCollectionV1",
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
describe("original-parent canonical variation root and creation proof", () => {
  const version = Object.getOwnPropertyDescriptor(process.versions, "node");
  afterEach(() => {
    vi.restoreAllMocks();
    if (version) Object.defineProperty(process.versions, "node", version);
  });
  const input = (history = pitchHistory(), seed = 0) => ({
    schema: "nightdrive.arpeggiator-variation-request.v1",
    parent: {
      schema: "nightdrive.variation-state.v1",
      stateHash: independentState(selectedEditorRevisionV1(history)).state.stateHash,
    },
    rootSeed: seed,
  });
  const generate = (history = pitchHistory(), seed = 0) =>
    generateOriginalArpeggiatorVariationRootForNodeV1(
      source(),
      request(),
      history,
      input(history, seed),
    );
  type RootPair = Awaited<ReturnType<typeof generate>>;
  const verify = (pair: RootPair, history = pair.creationProof.parentHistory) =>
    verifyOriginalArpeggiatorVariationRootForNodeV1(
      source(),
      request(),
      history,
      pair.variation.request,
      pair.variation,
      pair.creationProof,
    );
  const serialize = (pair: RootPair) =>
    serializeOriginalArpeggiatorVariationRootForNodeV1(
      source(),
      request(),
      pair.creationProof.parentHistory,
      pair.variation.request,
      pair.variation,
      pair.creationProof,
    );
  const hash = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
  // Independently transcribed accepted Stage7 fixture and new-domain projection.
  // No production variation/aggregate serializer, generator or digest is used
  // to obtain any expected note, field order, canonical input or digest.
  function literalMultiEditHistory(): EditorHistoryV1 {
    const root = JSON.parse(EXPECTED_START_TICK_ROOT_JSON) as EditorRevisionV1;
    const first = root.tracks[3]?.notes[0];
    const second = root.tracks[3]?.notes[1];
    if (!first || !second) throw new Error("Missing literal multi-edit notes");
    const commands: EditorNoteCommand[] = [
      {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: first.id,
        expectedPitch: 75,
        pitch: 74,
      },
      {
        schema: "nightdrive.editor-note-command.v2",
        type: "set-note-start-tick",
        noteId: first.id,
        expectedStartTick: 0,
        startTick: 240,
      },
      {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: first.id,
        expectedDurationTicks: 960,
        durationTicks: 480,
      },
      {
        schema: "nightdrive.editor-note-command.v7",
        type: "set-note-velocity",
        noteId: first.id,
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
      { schema: "nightdrive.editor-note-command.v4", type: "delete-note", noteId: second.id },
    ];
    const revisions = [root];
    for (const command of commands) {
      const previous = revisions[revisions.length - 1];
      if (!previous) throw new Error("Missing literal parent");
      const tracks = structuredClone(previous.tracks).map((track) => {
        if (track.role !== "lead") return track;
        let notes = [...track.notes];
        if (command.type === "set-note-pitch")
          notes = notes.map((note) => (note.id === first.id ? { ...note, pitch: 74 } : note));
        if (command.type === "set-note-start-tick")
          notes = notes.map((note) => (note.id === first.id ? { ...note, startTick: 240 } : note));
        if (command.type === "set-note-duration")
          notes = notes.map((note) =>
            note.id === first.id ? { ...note, durationTicks: 480 } : note,
          );
        if (command.type === "set-note-velocity")
          notes = notes.map((note) => (note.id === first.id ? { ...note, velocity: 80 } : note));
        if (command.type === "add-note") {
          const id = `note-${hash({ schema: "nightdrive.editor-added-note-id-input.v1", parent: { schema: previous.schema, revisionHash: previous.revisionHash }, command })}`;
          notes.push({ id, pitch: 72, startTick: 30000, durationTicks: 480, velocity: 100 });
        }
        if (command.type === "delete-note") notes = notes.filter((note) => note.id !== second.id);
        return { role: track.role, notes };
      });
      const values = {
        schema: previous.schema,
        source: previous.source,
        section: previous.section,
        tracks,
        parent: { schema: previous.schema, revisionHash: previous.revisionHash },
        command,
      };
      revisions.push({
        ...values,
        revisionHash: hash({
          schema: "nightdrive.editor-revision-hash-input.v1",
          revision: values,
        }),
      });
    }
    return { source: source() as unknown as CompleteSectionResultV1, revisions, cursor: 6 };
  }
  function present<T>(value: T | undefined | null): T {
    if (value === undefined || value === null) throw new Error("Independent fixture value missing");
    return value;
  }
  function expectedRoot(
    history: EditorHistoryV1 = {
      source: source() as unknown as CompleteSectionResultV1,
      revisions: [
        JSON.parse(EXPECTED_START_TICK_ROOT_JSON) as EditorRevisionV1,
        literalPitchChild(),
      ],
      cursor: 1,
    },
    parentRoot: unknown = null,
  ) {
    const selected = history.revisions[history.cursor];
    if (!selected) throw new Error("Missing independently constructed selection");
    const originalParent = independentState(selected).state;
    const retainedRoot = parentRoot as compositionState.OriginalArpeggiatorVariationV1 | null;
    const parentTracks = originalParent.tracks.map((track) =>
      retainedRoot && track.role === "arpeggiator" ? present(retainedRoot.tracks[2]) : track,
    );
    const parentTrackHashes = {
      harmony: hash({ schema: "nightdrive.variation-track-hash-input.v1", track: parentTracks[0] }),
      bass: hash({ schema: "nightdrive.variation-track-hash-input.v1", track: parentTracks[1] }),
      arpeggiator: hash({
        schema: "nightdrive.variation-track-hash-input.v1",
        track: parentTracks[2],
      }),
      lead: hash({ schema: "nightdrive.variation-track-hash-input.v1", track: parentTracks[3] }),
    };
    const parentValues = {
      source: originalParent.source,
      variation: retainedRoot
        ? { schema: retainedRoot.schema, variationHash: retainedRoot.variationHash }
        : null,
      editor: originalParent.editor,
      section: originalParent.section,
      tracks: parentTracks,
      trackHashes: parentTrackHashes,
      musicHash: hash({
        schema: "nightdrive.variation-music-hash-input.v1",
        section: originalParent.section,
        tracks: parentTracks.map((track) => ({
          role: track.role,
          notes: track.notes.map(({ pitch, startTick, durationTicks, velocity }) => ({
            pitch,
            startTick,
            durationTicks,
            velocity,
          })),
        })),
      }),
    };
    const parent = {
      schema: originalParent.schema,
      ...parentValues,
      stateHash: hash({ schema: "nightdrive.variation-state-hash-input.v1", ...parentValues }),
    };
    const proposal = {
      schema: "nightdrive.arpeggiator-variation-request.v1",
      parent: { schema: parent.schema, stateHash: parent.stateHash },
      rootSeed: 0,
    };
    const partialGeneration = {
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
    const generation = { ...partialGeneration, resultHash: hash(partialGeneration) };
    const arp = {
      role: "arpeggiator",
      notes: LITERAL_COMPONENTS.arpeggiator.map((event, ordinal) => ({
        id: `note-${hash({ schema: "nightdrive.variation-arpeggiator-note-id-input.v1", parent: proposal.parent, request: proposal, ordinal })}`,
        pitch: event.pitch,
        startTick: event.startTick,
        durationTicks: event.durationTicks,
        velocity: 100,
      })),
    };
    const tracks = parent.tracks.map((track) => (track.role === "arpeggiator" ? arp : track));
    const hashInputs = tracks.map((track) => ({
      schema: "nightdrive.variation-track-hash-input.v1",
      track,
    }));
    const trackHashes = {
      harmony: hash(hashInputs[0]),
      bass: hash(hashInputs[1]),
      arpeggiator: hash(hashInputs[2]),
      lead: hash(hashInputs[3]),
    };
    const musicInput = {
      schema: "nightdrive.variation-music-hash-input.v1",
      section: parent.section,
      tracks: tracks.map((track) => ({
        role: track.role,
        notes: track.notes.map(({ pitch, startTick, durationTicks, velocity }) => ({
          pitch,
          startTick,
          durationTicks,
          velocity,
        })),
      })),
    };
    const values = {
      source: parent.source,
      parent: proposal.parent,
      request: proposal,
      generation,
      section: parent.section,
      tracks,
      trackHashes,
      musicHash: hash(musicInput),
      unchanged: true,
    };
    const variationHashInput = {
      schema: "nightdrive.arpeggiator-variation-hash-input.v1",
      ...values,
    };
    const variation = {
      schema: "nightdrive.arpeggiator-variation.v1",
      ...values,
      variationHash: hash(variationHashInput),
    };
    return {
      variation,
      hashInputs,
      musicInput,
      variationHashInput,
      creationProof: {
        schema: "nightdrive.variation-creation-proof.v1",
        variation: { schema: variation.schema, variationHash: variation.variationHash },
        parent,
        parentVariation: parentRoot,
        parentHistory: history,
      },
    };
  }
  it("matches independently constructed complete root/proof, canonical UTF8, all IDs and hash inputs", async () => {
    const history = pitchHistory();
    const actual = await generate(history);
    const expected = expectedRoot();
    expect(actual).toEqual({
      variation: expected.variation,
      creationProof: expected.creationProof,
    });
    expect(JSON.stringify(actual.variation)).toBe(JSON.stringify(expected.variation));
    expect(Buffer.from(JSON.stringify(actual.variation), "utf8")).toEqual(
      Buffer.from(JSON.stringify(expected.variation), "utf8"),
    );
    expect(actual.variation.variationHash).toBe(hash(expected.variationHashInput));
    expect(actual.variation.musicHash).toBe(hash(expected.musicInput));
    expect(Object.values(actual.variation.trackHashes)).toEqual(expected.hashInputs.map(hash));
    expect(actual.variation.generation.componentHashes).toEqual(
      expected.variation.generation.componentHashes,
    );
    expect(actual.variation.generation.resultHash).toBe(expected.variation.generation.resultHash);
    expect(actual.variation.unchanged).toBe(true);
    expect(actual.variation.musicHash).toBe(actual.creationProof.parent.musicHash);
    expect(actual.variation.tracks[2]?.notes[0]?.id).not.toBe(
      actual.creationProof.parent.tracks[2]?.notes[0]?.id,
    );
    frozen(actual);
    expect(actual.creationProof.parentHistory).not.toBe(history);
    expect(actual.creationProof.parentHistory.revisions).not.toBe(history.revisions);
    expect(Object.keys(actual)).toEqual(["variation", "creationProof"]);
  });
  it("matches the complete independent multi-edit canonical parent/root/proof and all hash bytes", async () => {
    const literalHistory = literalMultiEditHistory();
    let actualHistory = rootHistory();
    for (const revision of literalHistory.revisions.slice(1)) {
      if (!revision.command) throw new Error("Missing literal command");
      actualHistory = apply(actualHistory, revision.command);
    }
    expect(actualHistory).toEqual(literalHistory);
    const actual = await generate(actualHistory);
    const expected = expectedRoot(literalHistory);
    expect(actual).toEqual({
      variation: expected.variation,
      creationProof: expected.creationProof,
    });
    expect(await serialize(actual)).toBe(JSON.stringify(expected.variation));
    expect(Buffer.from(JSON.stringify(actual.variation))).toEqual(
      Buffer.from(JSON.stringify(expected.variation)),
    );
    expect(actual.variation.trackHashes).toEqual(expected.variation.trackHashes);
    expect(actual.variation.musicHash).toBe(hash(expected.musicInput));
    expect(actual.variation.variationHash).toBe(hash(expected.variationHashInput));
    expect(actual.creationProof.parent.tracks[3]?.notes[0]).toMatchObject({
      pitch: 74,
      startTick: 240,
      durationTicks: 480,
      velocity: 80,
    });
    expect(actual.variation.tracks[3]?.notes.at(-1)).toMatchObject({
      pitch: 72,
      startTick: 30000,
      durationTicks: 480,
      velocity: 100,
    });
    // Fixed digests were calculated from the literal test-side oracle above
    // with node:crypto, never from a production variation result/serializer.
    expect(expected.variation.variationHash).toBe(
      "9836e2b631fc79f4ef9fcbfcb198e999296e2dbe9cebd30711cd5ab4eaf86a9d",
    );
    expect(expected.variation.musicHash).toBe(
      "06f78515db4414150cc19b5347e2044fd950941abd8bd5e921a7d453d233bc0a",
    );
    expect(literalHistory.revisions[6]?.revisionHash).toBe(
      "c9c58f26c49371afa02a396db85c0c4264de1121e7bb831a3be1e24ccc5d3c69",
    );
    expect(expected.variation.trackHashes).toEqual({
      harmony: "253fb79d977986db2649f3c540a33739b5d17544184bb23e7b964776be43dd53",
      bass: "0c52b648b390d71b5e8986d7c1dd1186a567279384e7fa17eb8c023719346b0e",
      arpeggiator: "0e65cd6d39324e316f438f9807979a4060a6e666635eec94cdc23681b97d0d32",
      lead: "1a8d1ef2a7ffaf3e73129305385413cd0238aaf0d7cb8cee476c3df37199500c",
    });
  });
  it("authoritatively verifies and serializes by fresh replay once for every public invocation", async () => {
    const sourceReplay = vi.spyOn(generator, "generateCompleteSectionV1");
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    const actual = await generate();
    expect(sourceReplay).toHaveBeenCalledTimes(1);
    expect(target).toHaveBeenCalledTimes(1);
    expect(await verify(actual)).toEqual(actual);
    expect(sourceReplay).toHaveBeenCalledTimes(2);
    expect(target).toHaveBeenCalledTimes(2);
    expect(await serialize(actual)).toBe(JSON.stringify(expectedRoot().variation));
    expect(sourceReplay).toHaveBeenCalledTimes(3);
    expect(target).toHaveBeenCalledTimes(3);
  });
  it("same verified parent/request repeats exactly; another parent changes lineage and stable IDs", async () => {
    const a = await generate();
    expect(await generate()).toEqual(a);
    const b = await generate(rootHistory());
    expect(b.variation.parent).not.toEqual(a.variation.parent);
    expect(b.variation.variationHash).not.toBe(a.variation.variationHash);
    expect(b.variation.tracks[2]?.notes[0]?.id).not.toBe(a.variation.tracks[2]?.notes[0]?.id);
    expect(b.variation.generation).toEqual(a.variation.generation);
  });
  it.each([17, 4294967295])(
    "seed %s preserves exact protected tracks/hashes/source/section without touching history",
    async (seed) => {
      let history = pitchHistory();
      let note = selectedEditorRevisionV1(history).tracks[3]?.notes[0];
      if (!note) throw new Error("Missing target");
      history = apply(history, {
        schema: "nightdrive.editor-note-command.v2",
        type: "set-note-start-tick",
        noteId: note.id,
        expectedStartTick: note.startTick,
        startTick: 240,
      });
      history = apply(history, {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: note.id,
        expectedDurationTicks: note.durationTicks,
        durationTicks: 480,
      });
      history = apply(history, {
        schema: "nightdrive.editor-note-command.v7",
        type: "set-note-velocity",
        noteId: note.id,
        expectedVelocity: note.velocity,
        velocity: 80,
      });
      history = apply(history, {
        schema: "nightdrive.editor-note-command.v6",
        type: "add-note",
        pitch: 72,
        startTick: 30000,
        durationTicks: 480,
      });
      note = selectedEditorRevisionV1(history).tracks[3]?.notes[1];
      if (!note) throw new Error("Missing delete target");
      history = apply(history, {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: note.id,
      });
      const before = JSON.stringify(history);
      const result = await generate(history, seed);
      const parent = independentState(selectedEditorRevisionV1(history)).state;
      expect(result.variation.source).toEqual(parent.source);
      expect(result.variation.section).toEqual(parent.section);
      for (const index of [0, 1, 3])
        expect(result.variation.tracks[index]).toEqual(parent.tracks[index]);
      for (const role of ["harmony", "bass", "lead"] as const)
        expect(result.variation.trackHashes[role]).toBe(parent.trackHashes[role]);
      expect(result.variation.request.rootSeed).toBe(seed);
      expect(result.variation.generation.provenance.rootSeed).toBe(seed);
      expect(result.variation.tracks[2]?.notes.every((n) => n.velocity === 100)).toBe(true);
      expect(JSON.stringify(history)).toBe(before);
      expect(await verify(result)).toEqual(result);
    },
  );
  it("retains and verifies the exact saved redo path even when its cursor precedes creation", async () => {
    const undone = undoEditorHistoryV1(pitchHistory());
    if (!undone) throw new Error("Missing undone history");
    const pair = await generate(undone);
    expect(pair.creationProof.parentHistory.cursor).toBe(0);
    expect(pair.creationProof.parentHistory.revisions).toHaveLength(2);
    expect(await verify(pair)).toEqual(pair);
    const forged = structuredClone(pair);
    Object.assign(forged.creationProof, { parentHistory: rootHistory() });
    await expect(
      verifyOriginalArpeggiatorVariationRootForNodeV1(
        source(),
        request(),
        undone,
        pair.variation.request,
        forged.variation,
        forged.creationProof,
      ),
    ).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
      field: "creationProof.parentHistory",
    });
    const badRedo = forgedChild(pitchHistory());
    await expect(
      generateOriginalArpeggiatorVariationRootForNodeV1(
        source(),
        request(),
        { ...badRedo, cursor: 0 },
        input(undone),
      ),
    ).rejects.toMatchObject({ code: "INVALID_EDITOR_LINEAGE" });
  });
  it("creation snapshot survives independent Undo/new-edit truncation of both active histories", async () => {
    const history = pitchHistory();
    const result = await generate(history);
    const saved = JSON.stringify(result.creationProof);
    const cursor = history.cursor;
    const first = selectedEditorRevisionV1(history).tracks[3]?.notes[0];
    if (!first) throw new Error("Missing note");
    const undone = undoEditorHistoryV1(history);
    if (!undone) throw new Error("Missing Undo result");
    const changed = (pitch: number) =>
      apply(undone, {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: first.id,
        expectedPitch: 75,
        pitch,
      });
    const parentActive = changed(73);
    const childActive = changed(72);
    expect(parentActive.revisions[cursor]?.revisionHash).not.toBe(
      history.revisions[cursor]?.revisionHash,
    );
    expect(childActive.revisions[cursor]?.revisionHash).not.toBe(
      history.revisions[cursor]?.revisionHash,
    );
    expect(JSON.stringify(result.creationProof)).toBe(saved);
    expect(await verify(result)).toEqual(result);
    // This proves immutable saved original-parent proof, not collection retention
    // or recursive descendants (separately unimplemented).
  });
  it.each(["owner", "parent", "history", "cursor", "nonoriginal", "schema", "missing"])(
    "rejects substituted creation proof: %s before target generation",
    async (kind) => {
      const value = structuredClone(await generate());
      const proof = value.creationProof as unknown as Record<string, unknown>;
      if (kind === "owner")
        proof.variation = { schema: value.variation.schema, variationHash: "0".repeat(64) };
      if (kind === "parent")
        proof.parent = independentState(selectedEditorRevisionV1(rootHistory())).state;
      if (kind === "history") proof.parentHistory = rootHistory();
      if (kind === "cursor")
        proof.parentHistory = { ...value.creationProof.parentHistory, cursor: 0 };
      if (kind === "nonoriginal") proof.parentVariation = value.variation;
      if (kind === "schema") proof.schema = "future";
      const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      await expect(
        verifyOriginalArpeggiatorVariationRootForNodeV1(
          source(),
          request(),
          pitchHistory(),
          input(),
          value.variation,
          kind === "missing" ? null : proof,
        ),
      ).rejects.toMatchObject({ code: "INVALID_VARIATION_LINEAGE" });
      expect(target).not.toHaveBeenCalled();
    },
  );
  it.each(["lead", "arp", "generation", "hash", "unchanged"])(
    "rejects forged self-consistent root via verification and serialization: %s",
    async (kind) => {
      const value = structuredClone(await generate());
      Object.assign(value, { variation: structuredClone(value.variation) });
      const root = value.variation as unknown as Record<string, unknown>;
      if (kind === "lead") (value.variation.tracks[3]?.notes[0] as { pitch: number }).pitch = 73;
      if (kind === "arp") (value.variation.tracks[2]?.notes[0] as { pitch: number }).pitch = 54;
      if (kind === "generation")
        root.generation = { ...value.variation.generation, resultHash: "0".repeat(64) };
      if (kind === "hash") root.musicHash = "0".repeat(64);
      if (kind === "unchanged") root.unchanged = false;
      const { schema: _schema, variationHash: _hash, ...values } = root;
      root.variationHash = hash({
        schema: "nightdrive.arpeggiator-variation-hash-input.v1",
        ...values,
      });
      (value.creationProof.variation as { variationHash: string }).variationHash =
        root.variationHash as string;
      const code =
        kind === "lead"
          ? "VARIATION_LOCK_MISMATCH"
          : kind === "arp"
            ? "INVALID_VARIATION_STATE"
            : "VARIATION_HASH_MISMATCH";
      await expect(verify(value)).rejects.toMatchObject({ code });
      await expect(serialize(value)).rejects.toMatchObject({ code });
    },
  );
  it("rejects a global regenerated-note collision without salting/retry or partial output", async () => {
    const parentNote = selectedEditorRevisionV1(pitchHistory()).tracks[3]?.notes[0];
    if (!parentNote) throw new Error("Missing collision target");
    const originalDigest = digestAdapter.digestStage7CanonicalUtf8;
    vi.spyOn(digestAdapter, "digestStage7CanonicalUtf8").mockImplementation((text) =>
      text.includes('"schema":"nightdrive.variation-arpeggiator-note-id-input.v1"')
        ? parentNote.id.slice(5)
        : originalDigest(text),
    );
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    await expect(generate()).rejects.toMatchObject({ code: "VARIATION_NOTE_ID_COLLISION" });
    expect(target).toHaveBeenCalledTimes(1);
  });
  it.each(["root", "proof"])(
    "rejects extra undefined nested %s fields rather than JSON-normalizing them away",
    async (owner) => {
      const pair = structuredClone(await generate());
      if (owner === "root")
        Object.assign(pair.variation.generation.provenance, { extra: undefined });
      else Object.assign(pair.creationProof.parent.source, { extra: undefined });
      await expect(verify(pair)).rejects.toBeInstanceOf(compositionState.VariationRootValueError);
      await expect(serialize(pair)).rejects.toBeInstanceOf(
        compositionState.VariationRootValueError,
      );
    },
  );
  it("rejects unsafe proof before replay without invoking getter/toJSON", async () => {
    const actual = await generate();
    const hook = vi.fn();
    const unsafe = Object.defineProperty({}, "parentHistory", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(
      verifyOriginalArpeggiatorVariationRootForNodeV1(
        source(),
        request(),
        pitchHistory(),
        input(),
        actual.variation,
        unsafe,
      ),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_INPUT" });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });
  it("source-admission failure precedes proof semantics and dispatches no target", async () => {
    const actual = await generate();
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    await expect(
      verifyOriginalArpeggiatorVariationRootForNodeV1(
        source(),
        undefined,
        pitchHistory(),
        input(),
        actual.variation,
        null,
      ),
    ).rejects.toMatchObject({ code: "INVALID_SOURCE_ADMISSION_REQUEST" });
    expect(target).not.toHaveBeenCalled();
  });
  it("stale parent beats invalid seed and delegated target failure changes no input", async () => {
    const history = pitchHistory();
    const proposal = {
      ...input(),
      parent: { ...input().parent, stateHash: "0".repeat(64) },
      rootSeed: -1,
    };
    await expect(
      generateOriginalArpeggiatorVariationRootForNodeV1(source(), request(), history, proposal),
    ).rejects.toMatchObject({ code: "STALE_VARIATION_PARENT" });
    const before = JSON.stringify(history);
    const failure = new Error("synthetic target failure");
    vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1").mockRejectedValue(failure);
    await expect(generate()).rejects.toBe(failure);
    expect(JSON.stringify(history)).toBe(before);
  });
  it("detaches all retained inputs before asynchronous source admission", async () => {
    const original = structuredClone(source());
    const originalRequest = structuredClone(request());
    const history = structuredClone(pitchHistory());
    const proposal = input(history);
    const real = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementation(async (r) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(r);
    });
    const pending = generateOriginalArpeggiatorVariationRootForNodeV1(
      original,
      originalRequest,
      history,
      proposal,
    );
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    proposal.rootSeed = 17;
    (history as { cursor: number }).cursor = 0;
    release?.();
    expect(await pending).toEqual({
      variation: expectedRoot().variation,
      creationProof: expectedRoot().creationProof,
    });
  });
  it("all root public entries fail at the exact pinned runtime guard", async () => {
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(
      generateOriginalArpeggiatorVariationRootForNodeV1(null, null, null, null),
    ).rejects.toThrow("24.21.0");
    await expect(
      verifyOriginalArpeggiatorVariationRootForNodeV1(null, null, null, null, null, null),
    ).rejects.toThrow("24.21.0");
    await expect(
      serializeOriginalArpeggiatorVariationRootForNodeV1(null, null, null, null, null, null),
    ).rejects.toThrow("24.21.0");
    expect(replay).not.toHaveBeenCalled();
  });
  // Literal attempt bytes/digest calculated separately from production, binding
  // the independently fixed multi-edit root above. No production output oracle.
  const ATTEMPT_JSON =
    '{"schema":"nightdrive.variation-attempt.v1","sequence":1,"variation":{"schema":"nightdrive.arpeggiator-variation.v1","variationHash":"9836e2b631fc79f4ef9fcbfcb198e999296e2dbe9cebd30711cd5ab4eaf86a9d"},"actor":"local-producer-unverified","createdAt":"2026-10-11T20:00:00.000Z","attemptHash":"1d8c5f748ce6620a32a1739104c24c61e8ab9982fe13c1cec7113469ac2630ed"}';
  const attemptFixture = (sequence = 1) => {
    const values = {
      sequence,
      variation: {
        schema: "nightdrive.arpeggiator-variation.v1",
        variationHash: "9836e2b631fc79f4ef9fcbfcb198e999296e2dbe9cebd30711cd5ab4eaf86a9d",
      },
      actor: "local-producer-unverified",
      createdAt: "2026-10-11T20:00:00.000Z",
    };
    return {
      schema: "nightdrive.variation-attempt.v1",
      ...values,
      attemptHash: hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values }),
    };
  };
  const verifyAttempt = (
    attempt: unknown = attemptFixture(),
    roots: unknown = [pairOnly(expectedRoot(literalMultiEditHistory()))],
  ) => verifyVariationAttemptForNodeV1(source(), request(), roots, attempt);
  it("verifies and serializes exact independent attempt JSON/UTF8/hash through Node with one fresh source replay per invocation", async () => {
    const supplied = attemptFixture();
    expect(JSON.stringify(supplied)).toBe(ATTEMPT_JSON);
    const owners = [pairOnly(expectedRoot(literalMultiEditHistory()))];
    const saved = JSON.stringify({ supplied, owners });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const delegate = vi.spyOn(attemptComposition, "verifyVariationAttemptV1");
    const result = await verifyAttempt(supplied, owners);
    expect(delegate).toHaveBeenCalledTimes(1);
    expect(delegate).toHaveBeenCalledWith(source(), request(), owners, supplied);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(result).toEqual(JSON.parse(ATTEMPT_JSON));
    expect(result).not.toBe(supplied);
    expect(result.variation).not.toBe(supplied.variation);
    frozen(result);
    const serialize = vi.spyOn(attemptComposition, "serializeVariationAttemptV1");
    const text = await serializeVariationAttemptForNodeV1(source(), request(), owners, supplied);
    expect(serialize).toHaveBeenCalledTimes(1);
    expect(text).toBe(ATTEMPT_JSON);
    expect(Buffer.from(text, "utf8")).toEqual(Buffer.from(ATTEMPT_JSON, "utf8"));
    expect(replay).toHaveBeenCalledTimes(2);
    expect(JSON.stringify({ supplied, owners })).toBe(saved);
  });
  it.each(["missing", "extra", "reordered", "identity-order"])(
    "rejects noncanonical attempt envelope %s without repairing it",
    async (kind) => {
      const proposal: Record<string, unknown> = attemptFixture();
      if (kind === "missing") delete proposal.actor;
      if (kind === "extra") proposal.extra = "ignored fields are forbidden";
      const supplied =
        kind === "reordered"
          ? {
              sequence: proposal.sequence,
              schema: proposal.schema,
              variation: proposal.variation,
              actor: proposal.actor,
              createdAt: proposal.createdAt,
              attemptHash: proposal.attemptHash,
            }
          : proposal;
      if (kind === "identity-order")
        supplied.variation = {
          variationHash: attemptFixture().variation.variationHash,
          schema: "nightdrive.arpeggiator-variation.v1",
        };
      const saved = JSON.stringify(supplied);
      await expect(verifyAttempt(supplied)).rejects.toMatchObject({
        code: kind === "identity-order" ? "INVALID_VARIATION_LINEAGE" : "INVALID_VARIATION_INPUT",
        field: kind === "identity-order" ? "attempt.variation" : "attempt",
      });
      expect(JSON.stringify(supplied)).toBe(saved);
    },
  );
  it("binds a descendant attempt only after its complete recursive owner closure and exports no hash-only constructor", async () => {
    expect(Object.keys(attemptComposition).sort()).toEqual(
      [
        "VARIATION_ATTEMPT_SCHEMA_V1",
        "VariationAttemptValueError",
        "serializeVariationAttemptV1",
        "verifyVariationAttemptV1",
      ].sort(),
    );
    const owners = closure();
    const descendant = present(owners.at(-1));
    const values = {
      sequence: 3,
      variation: {
        schema: descendant.variation.schema,
        variationHash: descendant.variation.variationHash,
      },
      actor: "local-producer-unverified",
      createdAt: "2026-10-11T20:00:00.000Z",
    };
    const proposal = {
      schema: "nightdrive.variation-attempt.v1",
      ...values,
      attemptHash: hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values }),
    };
    expect(await verifyAttempt(proposal, owners)).toEqual(proposal);
    await expect(verifyAttempt(proposal, [descendant])).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
    });
  });
  it("keeps repeated-root sequence metadata distinct without changing root/music/note identities or restamping time", async () => {
    const owners = [pairOnly(expectedRoot(literalMultiEditHistory()))];
    const saved = JSON.stringify(owners);
    const first = await verifyAttempt(attemptFixture(1), owners);
    const second = await verifyAttempt(attemptFixture(2), owners);
    expect(first.variation).toEqual(second.variation);
    expect(first.createdAt).toBe(second.createdAt);
    expect(first.attemptHash).not.toBe(second.attemptHash);
    expect(await verifyAttempt(second, owners)).toEqual(second);
    expect(JSON.stringify(owners)).toBe(saved);
  });
  it.each([
    ["sequence", 0, "INVALID_VARIATION_COLLECTION"],
    ["sequence", -1, "INVALID_VARIATION_COLLECTION"],
    ["sequence", 1.5, "INVALID_VARIATION_COLLECTION"],
    ["sequence", "1", "INVALID_VARIATION_COLLECTION"],
    ["sequence", Number.MAX_SAFE_INTEGER + 1, "INVALID_VARIATION_COLLECTION"],
    ["actor", "authenticated-producer", "INVALID_VARIATION_PROVENANCE"],
    ["createdAt", "2026-02-29T00:00:00.000Z", "INVALID_VARIATION_PROVENANCE"],
    ["createdAt", "2026-04-31T00:00:00.000Z", "INVALID_VARIATION_PROVENANCE"],
    ["createdAt", "2026-10-11T24:00:00.000Z", "INVALID_VARIATION_PROVENANCE"],
    ["createdAt", "2026-10-11T20:00:00Z", "INVALID_VARIATION_PROVENANCE"],
    ["createdAt", "2026-10-11T20:00:00.000+00:00", "INVALID_VARIATION_PROVENANCE"],
    ["createdAt", "2026-10-11T20:00:60.000Z", "INVALID_VARIATION_PROVENANCE"],
    ["attemptHash", "0".repeat(64), "VARIATION_HASH_MISMATCH"],
    ["attemptHash", "not-a-digest", "VARIATION_HASH_MISMATCH"],
  ])("rejects invalid attempt %s=%s without mutation", async (field, value, code) => {
    const proposal = attemptFixture();
    Reflect.set(proposal, field, value);
    const saved = JSON.stringify(proposal);
    await expect(verifyAttempt(proposal)).rejects.toMatchObject({
      code,
      field: `attempt.${field}`,
    });
    expect(JSON.stringify(proposal)).toBe(saved);
  });
  it("rejects unknown root identity and self-consistent metadata backed by forged or missing proof, including canonical serialization", async () => {
    const proposal = attemptFixture();
    proposal.variation.variationHash = "0".repeat(64);
    const { schema: _schema, attemptHash: _digest, ...input } = proposal;
    proposal.attemptHash = hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...input });
    await expect(verifyAttempt(proposal)).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
      field: "attempt.variation",
    });
    const owners = [pairOnly(expectedRoot(literalMultiEditHistory()))];
    owners[0].creationProof.parent.musicHash = "0".repeat(64);
    const saved = JSON.stringify(owners);
    await expect(verifyAttempt(attemptFixture(), owners)).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
    });
    await expect(
      serializeVariationAttemptForNodeV1(source(), request(), owners, attemptFixture()),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_LINEAGE" });
    await expect(
      serializeVariationAttemptForNodeV1(source(), request(), [], attemptFixture()),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_LINEAGE" });
    expect(JSON.stringify(owners)).toBe(saved);
  });
  it("rejects descriptors before replay, schema before source, source before metadata, and ordered attempt fields before digest", async () => {
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const hook = vi.fn();
    const unsafe = Object.defineProperty(attemptFixture(), "actor", { get: hook });
    await expect(verifyAttempt(unsafe)).rejects.toMatchObject({
      code: "INVALID_VARIATION_INPUT",
      field: "attempt",
    });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
    await expect(
      verifyVariationAttemptForNodeV1(null, null, null, {
        ...attemptFixture(),
        schema: "unsupported",
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_VARIATION_SCHEMA" });
    expect(replay).not.toHaveBeenCalled();
    const bad = {
      ...attemptFixture(),
      sequence: 0,
      actor: "invalid",
      createdAt: "invalid",
      attemptHash: "invalid",
    };
    await expect(
      verifyVariationAttemptForNodeV1(source(), undefined, [], bad),
    ).rejects.toMatchObject({ code: "INVALID_SOURCE_ADMISSION_REQUEST" });
    await expect(verifyAttempt(bad)).rejects.toMatchObject({ field: "attempt.sequence" });
    bad.sequence = 1;
    await expect(verifyAttempt(bad)).rejects.toMatchObject({ field: "attempt.actor" });
    bad.actor = "local-producer-unverified";
    await expect(verifyAttempt(bad)).rejects.toMatchObject({ field: "attempt.createdAt" });
  });
  it("accepts exact leap-day metadata and captures proposals before asynchronous replay without reading a clock", async () => {
    const proposal = attemptFixture();
    proposal.createdAt = "2024-02-29T23:59:59.999Z";
    const { schema: _schema, attemptHash: _digest, ...input } = proposal;
    proposal.attemptHash = hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...input });
    const saved = structuredClone(proposal);
    const replayed = await generator.generateCompleteSectionV1(request());
    let release: (() => void) | undefined;
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(replayed);
        }),
    );
    const clock = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Clock must not be read");
    });
    const pending = verifyAttempt(proposal);
    proposal.actor = "changed";
    present(release)();
    expect(await pending).toEqual(saved);
    expect(clock).not.toHaveBeenCalled();
  });
  it("guards both attempt Node operations before any source replay", async () => {
    Object.defineProperty(process.versions, "node", { value: "24.20.0", configurable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(verifyVariationAttemptForNodeV1(null, null, null, null)).rejects.toThrow(
      "24.21.0",
    );
    await expect(serializeVariationAttemptForNodeV1(null, null, null, null)).rejects.toThrow(
      "24.21.0",
    );
    expect(replay).not.toHaveBeenCalled();
  });
  const pairOnly = (expected: ReturnType<typeof expectedRoot>) => ({
    variation: expected.variation,
    creationProof: expected.creationProof,
  });
  const closure = () => {
    const first = pairOnly(expectedRoot(literalMultiEditHistory()));
    const second = pairOnly(expectedRoot(pitchHistory(), first.variation));
    const third = pairOnly(expectedRoot(rootHistory(), second.variation));
    return [first, second, third];
  };
  const verifyClosure = (values: unknown) =>
    verifyArpeggiatorVariationAncestryForNodeV1(source(), request(), values);

  it("proves the independent three-root canonical closure with one fresh source replay and exact absolute hashes/bytes", async () => {
    const expected = closure();
    const before = JSON.stringify(expected);
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const result = await verifyClosure(expected);
    expect(JSON.stringify(result)).toBe(before);
    expect(Buffer.from(JSON.stringify(result))).toEqual(Buffer.from(before));
    expect(replay).toHaveBeenCalledTimes(1);
    expect(result).not.toBe(expected);
    expect(Object.isFrozen(result)).toBe(true);
    for (const pair of result) {
      expect(Object.isFrozen(pair.creationProof.parentHistory.revisions)).toBe(true);
      expect(Object.isFrozen(pair.variation.tracks[2]?.notes[0])).toBe(true);
    }
    await verifyClosure(expected);
    expect(replay).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(expected)).toBe(before);
  });
  it("verifies C and its descendant after both active histories independently lose creation revision R", async () => {
    const history = pitchHistory();
    const child = pairOnly(expectedRoot(history));
    const undone = present(undoEditorHistoryV1(history));
    const originalNote = present(present(selectedEditorRevisionV1(undone).tracks[3]).notes[0]);
    const edit = (pitch: number) =>
      applyEditorCommandV1(undone, selectedEditorRevisionV1(undone), {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: originalNote.id,
        expectedPitch: originalNote.pitch,
        pitch,
      });
    const parentActive = edit(73);
    const childActive = edit(72);
    const creationHash = selectedEditorRevisionV1(history).revisionHash;
    expect(parentActive.revisions.some((r) => r.revisionHash === creationHash)).toBe(false);
    expect(childActive.revisions.some((r) => r.revisionHash === creationHash)).toBe(false);
    const saved = JSON.stringify(child.creationProof);
    const descendant = pairOnly(expectedRoot(childActive, child.variation));
    const result = await verifyClosure([child, descendant]);
    expect(JSON.stringify(result[0]?.creationProof)).toBe(saved);
    expect(result[1]?.creationProof.parent.editor.revisionHash).toBe(
      selectedEditorRevisionV1(childActive).revisionHash,
    );
    expect(result[1]?.creationProof.parent.tracks[3]).toEqual(
      selectedEditorRevisionV1(childActive).tracks[3],
    );
    expect(result[1]?.creationProof.parent.tracks[2]).toEqual(child.variation.tracks[2]);
  });
  it("accepts equal duplicate owners without coupling or granting reusable authority", async () => {
    const [first, second] = closure();
    const result = await verifyClosure([first, structuredClone(first), second]);
    expect(result[0]).toEqual(result[1]);
    expect(result[0]).not.toBe(result[1]);
  });
  it.each(["original", "variation"] as const)(
    "accepts repeated %s-parent roots before and after Undo adds a valid redo suffix, including descendants",
    async (kind) => {
      const initial = rootHistory();
      const undone = present(undoEditorHistoryV1(pitchHistory()));
      expect(selectedEditorRevisionV1(undone)).toEqual(selectedEditorRevisionV1(initial));
      const ancestors = kind === "variation" ? [present(closure()[0])] : [];
      const parent = ancestors[0]?.variation ?? null;
      const create = (history: EditorHistoryV1) =>
        parent === null
          ? generate(history)
          : generateVariationParentArpeggiatorRootForNodeV1(
              source(),
              request(),
              history,
              expectedRoot(history, parent).variation.request,
              parent,
              ancestors,
            );
      const beforeUndo = await create(initial);
      const afterUndo = await create(undone);
      expect(beforeUndo).toEqual(pairOnly(expectedRoot(initial, parent)));
      expect(afterUndo).toEqual(pairOnly(expectedRoot(undone, parent)));
      expect(afterUndo.variation).toEqual(beforeUndo.variation);
      expect(afterUndo.creationProof).not.toEqual(beforeUndo.creationProof);
      expect(beforeUndo.creationProof.parentHistory.revisions).toHaveLength(1);
      expect(afterUndo.creationProof.parentHistory.revisions).toHaveLength(2);
      expect(afterUndo.creationProof.parentHistory.cursor).toBe(0);
      const descendant = pairOnly(expectedRoot(pitchHistory(), beforeUndo.variation));
      for (const duplicates of [
        [beforeUndo, afterUndo],
        [afterUndo, beforeUndo],
      ]) {
        const supplied = [...ancestors, ...duplicates, descendant];
        const saved = JSON.stringify(supplied);
        const verified = await verifyClosure(supplied);
        expect(JSON.stringify(verified)).toBe(saved);
        expect(JSON.stringify(supplied)).toBe(saved);
        expect(verified.at(-1)).toEqual(descendant);
        expect(verified[ancestors.length]).not.toBe(verified[ancestors.length + 1]);
        frozen(verified);
      }
    },
  );
  it("rejects a duplicate root with a self-consistently hashed forged redo revision instead of trusting its earlier owner", async () => {
    const first = pairOnly(expectedRoot(rootHistory()));
    const second = pairOnly(expectedRoot(present(undoEditorHistoryV1(pitchHistory()))));
    expect(second.variation).toEqual(first.variation);
    const forged = forgedChild(second.creationProof.parentHistory);
    expect(forged.cursor).toBe(0);
    Reflect.set(second.creationProof, "parentHistory", forged);
    const supplied = [first, second];
    const saved = JSON.stringify(supplied);
    await expect(verifyClosure(supplied)).rejects.toMatchObject({
      code: "INVALID_EDITOR_LINEAGE",
      field: "revision.parent",
    });
    expect(JSON.stringify(supplied)).toBe(saved);
    // The identical selected root alone must not bypass the old editor's
    // complete redo-transition verification, even with a recomputed digest.
    expect(await verifyClosure([first])).toEqual([first]);
  });
  it.each([
    "missing",
    "forward",
    "cycle",
    "conflict",
    "wrong-owner",
    "saved-cursor",
    "parent-state",
    "source",
    "schema",
    "self-consistent-root",
  ])("fails closed for %s ancestor/proof substitution", async (kind) => {
    const values = structuredClone(closure());
    if (kind === "missing") values.shift();
    if (kind === "forward") values.reverse();
    if (kind === "cycle")
      present(values[0]).creationProof.parentVariation = present(values[1]).variation;
    if (kind === "conflict") {
      const altered = structuredClone(present(values[0]));
      altered.variation.unchanged = false;
      values.splice(1, 0, altered);
    }
    if (kind === "wrong-owner")
      present(values[1]).creationProof.variation.variationHash = "0".repeat(64);
    if (kind === "saved-cursor")
      Reflect.set(present(values[1]).creationProof.parentHistory, "cursor", 0);
    if (kind === "parent-state") present(values[1]).creationProof.parent.musicHash = "0".repeat(64);
    if (kind === "source") {
      const otherRequest = request();
      Reflect.set(otherRequest.composition, "rootSeed", 17);
      Reflect.set(
        present(values[1]).creationProof.parentHistory,
        "source",
        await generator.generateCompleteSectionV1(otherRequest),
      );
    }
    if (kind === "schema") present(values[1]).creationProof.schema = "invalid";
    if (kind === "self-consistent-root") {
      const root = present(values[1]).variation;
      root.tracks = structuredClone(root.tracks);
      Reflect.set(present(present(root.tracks[3]).notes[0]), "pitch", 60);
      const { schema: _schema, variationHash: _hash, ...input } = root;
      root.variationHash = hash({
        schema: "nightdrive.arpeggiator-variation-hash-input.v1",
        ...input,
      });
      present(values[1]).creationProof.variation.variationHash = root.variationHash;
    }
    const before = JSON.stringify(values);
    await expect(verifyClosure(values)).rejects.toMatchObject({
      code:
        kind === "self-consistent-root" ? "VARIATION_LOCK_MISMATCH" : "INVALID_VARIATION_LINEAGE",
    });
    expect(JSON.stringify(values)).toBe(before);
  });
  it("descriptor rejection precedes replay; source admission precedes malformed proof; stale parent precedes invalid seed", async () => {
    const hook = vi.fn();
    const unsafe = Object.defineProperty({}, "variation", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(verifyClosure([unsafe])).rejects.toMatchObject({
      code: "INVALID_VARIATION_INPUT",
    });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
    await expect(
      verifyArpeggiatorVariationAncestryForNodeV1(source(), undefined, [{}]),
    ).rejects.toMatchObject({ code: "INVALID_SOURCE_ADMISSION_REQUEST" });
    const values = closure();
    present(values[0]).variation.request = {
      ...present(values[0]).variation.request,
      parent: { ...present(values[0]).variation.request.parent, stateHash: "0".repeat(64) },
    };
    present(values[0]).variation.request.rootSeed = -1;
    await expect(verifyClosure(values)).rejects.toMatchObject({ code: "STALE_VARIATION_PARENT" });
  });
  it("does not replay or return partial proof after an invalid earlier owner", async () => {
    const values = closure();
    present(values[0]).creationProof.variation.variationHash = "0".repeat(64);
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    const install = vi.fn();
    await verifyClosure(values).then(install, () => undefined);
    expect(install).not.toHaveBeenCalled();
    // No variation-root Stage7 replay follows the failed proof.
    expect(target).not.toHaveBeenCalled();
  });
  it("detaches the entire ancestor closure before asynchronous admission", async () => {
    const values = structuredClone(closure());
    const before = JSON.stringify(values);
    const real = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementation(async (r) => {
      await gate;
      return real(r);
    });
    const pending = verifyClosure(values);
    present(values[0]).variation.variationHash = "0".repeat(64);
    Reflect.set(present(values[1]).creationProof.parentHistory, "cursor", 0);
    release?.();
    expect(JSON.stringify(await pending)).toBe(before);
  });
  it("requires exact pinned runtime before admission or proof access", async () => {
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(verifyClosure(undefined)).rejects.toThrow("Node 24.21.0");
    expect(replay).not.toHaveBeenCalled();
  });
  it("creates one variation-parent child with exact independent canonical hashes/proof and one admission", async () => {
    const ancestors = closure();
    const parent = present(ancestors[1]);
    const history = literalMultiEditHistory();
    const expected = pairOnly(expectedRoot(history, parent.variation));
    const before = JSON.stringify({ ancestors, history });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    const actual = await generateVariationParentArpeggiatorRootForNodeV1(
      source(),
      request(),
      history,
      expected.variation.request,
      parent.variation,
      ancestors,
    );
    expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
    expect(Buffer.from(JSON.stringify(actual))).toEqual(Buffer.from(JSON.stringify(expected)));
    expect(actual.creationProof.parentVariation).toEqual(parent.variation);
    expect(actual.creationProof.parentHistory).toEqual(history);
    expect(actual.creationProof.parentHistory).not.toBe(history);
    expect(Object.isFrozen(actual.creationProof.parentHistory.revisions)).toBe(true);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(target).toHaveBeenCalledTimes(ancestors.length + 1);
    for (const role of ["harmony", "bass", "lead"] as const) {
      expect(actual.variation.trackHashes[role]).toBe(
        expected.creationProof.parent.trackHashes[role],
      );
    }
    expect(JSON.stringify({ ancestors, history })).toBe(before);
    const verified = await verifyClosure([...ancestors, actual]);
    expect(verified.at(-1)).toEqual(actual);
  });
  it("forks complete cursor/redo proof without applying a redo or inferring the newest root", async () => {
    const ancestors = closure();
    const parent = present(ancestors[0]);
    const history = present(undoEditorHistoryV1(pitchHistory()));
    const expected = pairOnly(expectedRoot(history, parent.variation));
    const result = await generateVariationParentArpeggiatorRootForNodeV1(
      source(),
      request(),
      history,
      expected.variation.request,
      parent.variation,
      ancestors,
    );
    expect(result).toEqual(expected);
    expect(result.creationProof.parentHistory.cursor).toBe(0);
    expect(result.creationProof.parentHistory.revisions).toHaveLength(2);
    expect(result.creationProof.parentVariation).not.toEqual(ancestors.at(-1)?.variation);
  });
  it.each(["missing-owner", "changed-parent", "forged-history", "stale-parent", "seed"])(
    "rejects %s before new generation without mutating inputs",
    async (kind) => {
      const ancestors = closure();
      const parent = structuredClone(present(ancestors[0]).variation);
      const history = kind === "forged-history" ? forgedChild(pitchHistory()) : pitchHistory();
      const proposal = expectedRoot(history, parent).variation.request;
      if (kind === "missing-owner") ancestors.shift();
      if (kind === "changed-parent") parent.unchanged = false;
      if (kind === "stale-parent")
        proposal.parent = { ...proposal.parent, stateHash: "0".repeat(64) };
      if (kind === "stale-parent" || kind === "seed") proposal.rootSeed = -1;
      const before = JSON.stringify({ ancestors, parent, history, proposal });
      const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      await expect(
        generateVariationParentArpeggiatorRootForNodeV1(
          source(),
          request(),
          history,
          proposal,
          parent,
          ancestors,
        ),
      ).rejects.toMatchObject({
        code:
          kind === "forged-history"
            ? "INVALID_EDITOR_LINEAGE"
            : kind === "stale-parent"
              ? "STALE_VARIATION_PARENT"
              : kind === "seed"
                ? "INVALID_VARIATION_SEED"
                : "INVALID_VARIATION_LINEAGE",
      });
      expect(JSON.stringify({ ancestors, parent, history, proposal })).toBe(before);
      expect(target.mock.calls.length).toBeLessThanOrEqual(ancestors.length);
    },
  );
  it("does not return a partial root/proof if the new target generation fails", async () => {
    const ancestors = closure();
    const parent = present(ancestors[0]).variation;
    const history = pitchHistory();
    const proposal = expectedRoot(history, parent).variation.request;
    const real = aggregateGenerator.generateStage7ArpeggiatorAggregateV1;
    const failure = new Error("synthetic new-target failure");
    let calls = 0;
    vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1").mockImplementation((r) =>
      ++calls > ancestors.length ? Promise.reject(failure) : real(r),
    );
    const before = JSON.stringify({ ancestors, history });
    const install = vi.fn();
    const pending = generateVariationParentArpeggiatorRootForNodeV1(
      source(),
      request(),
      history,
      proposal,
      parent,
      ancestors,
    );
    void pending.then(install, () => undefined);
    await expect(pending).rejects.toBe(failure);
    expect(install).not.toHaveBeenCalled();
    expect(JSON.stringify({ ancestors, history })).toBe(before);
  });
  it("detaches all six creation inputs before admission and fails pinned runtime before any reads", async () => {
    const ancestors = structuredClone(closure());
    const parent = present(ancestors[0]).variation;
    const history = structuredClone(pitchHistory());
    const expected = structuredClone(pairOnly(expectedRoot(history, parent)));
    const proposal = structuredClone(expected.variation.request);
    const real = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementation(async (r) => {
      await gate;
      return real(r);
    });
    const pending = generateVariationParentArpeggiatorRootForNodeV1(
      source(),
      request(),
      history,
      proposal,
      parent,
      ancestors,
    );
    parent.variationHash = "0".repeat(64);
    Reflect.set(history, "cursor", 0);
    proposal.rootSeed = -1;
    ancestors.splice(1);
    release?.();
    expect(await pending).toEqual(expected);
    vi.restoreAllMocks();
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    const hook = vi.fn();
    const unsafe = Object.defineProperty({}, "schema", { enumerable: true, get: hook });
    await expect(
      generateVariationParentArpeggiatorRootForNodeV1(unsafe, null, null, null, null, null),
    ).rejects.toThrow("Node 24.21.0");
    expect(hook).not.toHaveBeenCalled();
  });

  function collectionFixture(
    roots = closure(),
    histories = roots.map((pair) => pair.creationProof.parentHistory),
    original = rootHistory(),
  ) {
    const originalEntry = {
      sequence: 0,
      attempt: null,
      variation: null,
      creationProof: null,
      history: original,
    };
    const alternatives = [
      originalEntry,
      ...roots.map((pair, index) => {
        const values = {
          sequence: index + 1,
          variation: { schema: pair.variation.schema, variationHash: pair.variation.variationHash },
          actor: "local-producer-unverified",
          createdAt: "2026-10-11T20:00:00.000Z",
        };
        return {
          sequence: index + 1,
          attempt: {
            schema: "nightdrive.variation-attempt.v1",
            ...values,
            attemptHash: hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values }),
          },
          variation: pair.variation,
          creationProof: pair.creationProof,
          history: present(histories[index]),
        };
      }),
    ];
    return {
      source: source(),
      sourceRequest: request(),
      alternatives,
      selectedSequence: roots.length,
      nextSequence: roots.length + 1,
    };
  }
  it("verifies independent full collection bytes including three descendant roots and attempts with one source replay", async () => {
    expect(process.versions.node).toBe("24.21.0");
    const input = collectionFixture();
    const expected = JSON.stringify(input);
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const clock = vi.spyOn(Date, "now");
    const result = await verifyVariationCollectionForNodeV1(input);
    expect(JSON.stringify(result)).toBe(expected);
    expect(result.source.resultHash).toBe(LITERAL_RESULT_HASH);
    expect(result.alternatives).toHaveLength(4);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(clock).not.toHaveBeenCalled();
    expect(result).not.toBe(input);
    expect(result.alternatives[1]?.history).not.toBe(input.alternatives[1]?.history);
    frozen(result);
  });
  it("verifies Original-only collection and normalizes negative zero without producing another context", async () => {
    const input = collectionFixture([]);
    input.selectedSequence = -0;
    const original = present(input.alternatives[0]);
    original.sequence = -0;
    const result = await verifyVariationCollectionForNodeV1(input);
    expect(result.selectedSequence).toBe(0);
    expect(result.alternatives[0]?.sequence).toBe(0);
    expect(result.nextSequence).toBe(1);
    expect(result.alternatives[0]?.attempt).toBeNull();
    expect(result.alternatives[0]?.variation).toBeNull();
    expect(result.alternatives[0]?.creationProof).toBeNull();
  });
  it("keeps duplicate root identities with distinct valid redo proofs and independent active histories", async () => {
    const undone = present(undoEditorHistoryV1(pitchHistory()));
    const first = pairOnly(expectedRoot(rootHistory()));
    const second = pairOnly(expectedRoot(undone));
    const descendant = pairOnly(expectedRoot(pitchHistory(), first.variation));
    expect(first.variation).toEqual(second.variation);
    expect(first.creationProof).not.toEqual(second.creationProof);
    const input = collectionFixture(
      [first, second, descendant],
      [rootHistory(), undone, pitchHistory()],
    );
    const result = await verifyVariationCollectionForNodeV1(input);
    expect(JSON.stringify(result)).toBe(JSON.stringify(input));
    expect(result.alternatives[1]?.variation).toEqual(result.alternatives[2]?.variation);
    expect(result.alternatives[1]?.creationProof).not.toEqual(
      result.alternatives[2]?.creationProof,
    );
    expect(result.alternatives[1]?.history).not.toBe(result.alternatives[2]?.history);
    expect(result.alternatives[1]?.attempt?.attemptHash).not.toBe(
      result.alternatives[2]?.attempt?.attemptHash,
    );
    const redo = present(redoEditorHistoryV1(present(result.alternatives[2]?.history)));
    expect(selectedEditorRevisionV1(redo).revisionHash).toBe(
      selectedEditorRevisionV1(pitchHistory()).revisionHash,
    );
    expect(result.alternatives[2]?.history.cursor).toBe(0);
  });
  it("retains creation proof after both current histories independently truncate its revision", async () => {
    const history = pitchHistory();
    const child = pairOnly(expectedRoot(history));
    const undone = present(undoEditorHistoryV1(history));
    const target = present(present(selectedEditorRevisionV1(undone).tracks[3]).notes[0]);
    const edit = (pitch: number) =>
      applyEditorCommandV1(undone, selectedEditorRevisionV1(undone), {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch,
      });
    const parentActive = edit(73);
    const childActive = edit(72);
    const creationHash = selectedEditorRevisionV1(history).revisionHash;
    for (const active of [parentActive, childActive])
      expect(active.revisions.some((r) => r.revisionHash === creationHash)).toBe(false);
    const descendant = pairOnly(expectedRoot(childActive, child.variation));
    const input = collectionFixture(
      [child, descendant],
      [childActive, rootHistory()],
      parentActive,
    );
    const result = await verifyVariationCollectionForNodeV1(input);
    expect(JSON.stringify(result)).toBe(JSON.stringify(input));
    expect(
      result.alternatives[1]?.creationProof?.parentHistory.revisions.some(
        (r) => r.revisionHash === creationHash,
      ),
    ).toBe(true);
  });
  it.each([0, 1, 2, 3])(
    "rejects forged active or redo history for alternative %s",
    async (sequence) => {
      const input = collectionFixture();
      const entry = present(input.alternatives[sequence]);
      Reflect.set(entry, "history", { ...forgedChild(pitchHistory()), cursor: 0 });
      await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
        code: "INVALID_EDITOR_LINEAGE",
      });
    },
  );
  it("rejects forged saved redo proof independently of valid active histories and duplicate owner", async () => {
    const first = pairOnly(expectedRoot(rootHistory()));
    const second = pairOnly(expectedRoot(present(undoEditorHistoryV1(pitchHistory()))));
    const input = collectionFixture([first, second]);
    const proof = structuredClone(second.creationProof);
    Reflect.set(proof, "parentHistory", { ...forgedChild(pitchHistory()), cursor: 0 });
    Reflect.set(present(input.alternatives[2]), "creationProof", proof);
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
      code: "INVALID_EDITOR_LINEAGE",
    });
  });
  it.each(["missing", "cycle", "conflict"])(
    "rejects %s creation proofs without repairing owners",
    async (kind) => {
      const pair = pairOnly(expectedRoot(rootHistory()));
      const input = collectionFixture([pair, structuredClone(pair)]);
      const entry = present(input.alternatives[kind === "conflict" ? 2 : 1]);
      if (kind === "missing") Reflect.set(entry, "creationProof", null);
      if (kind === "cycle") {
        const proof = structuredClone(pair.creationProof);
        Reflect.set(proof, "parentVariation", pair.variation);
        Reflect.set(entry, "creationProof", proof);
      }
      if (kind === "conflict") {
        const variation = structuredClone(pair.variation);
        Reflect.set(variation, "unchanged", !variation.unchanged);
        Reflect.set(entry, "variation", variation);
      }
      await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
        code: "INVALID_VARIATION_LINEAGE",
      });
    },
  );
  it("checks creation proof before active history, and earlier alternative before later proof", async () => {
    const input = collectionFixture();
    Reflect.set(present(input.alternatives[1]), "creationProof", null);
    Reflect.set(present(input.alternatives[1]), "history", null);
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
    });
    const second = collectionFixture();
    Reflect.set(present(second.alternatives[0]), "history", forgedChild(pitchHistory()));
    Reflect.set(present(second.alternatives[1]), "creationProof", null);
    await expect(verifyVariationCollectionForNodeV1(second)).rejects.toMatchObject({
      code: "INVALID_EDITOR_LINEAGE",
    });
  });
  it.each([
    ["selectedSequence", -1],
    ["selectedSequence", 99],
    ["selectedSequence", 0.5],
    ["nextSequence", 0],
    ["nextSequence", 5],
    ["nextSequence", Number.MAX_SAFE_INTEGER],
    ["nextSequence", NaN],
    ["selectedSequence", Infinity],
  ])("rejects malformed %s=%s", async (field, value) => {
    const input = collectionFixture([]);
    Reflect.set(input, field, value);
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
      code: "INVALID_VARIATION_COLLECTION",
      field: `collection.${field}`,
    });
  });
  it.each([0, 2, 0.5, -1, Number.MAX_SAFE_INTEGER])(
    "rejects non-consecutive child sequence %s",
    async (sequence) => {
      const input = collectionFixture([pairOnly(expectedRoot(rootHistory()))]);
      Reflect.set(present(input.alternatives[1]), "sequence", sequence);
      await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
        code: "INVALID_VARIATION_COLLECTION",
        field: "collection.alternatives.1.sequence",
      });
    },
  );
  it.each(["sequence", "variation", "actor", "createdAt", "attemptHash"])(
    "rejects attempt %s substitution even with a recomputed hash",
    async (field) => {
      const input = collectionFixture();
      const entry = present(input.alternatives[1]);
      const attempt = structuredClone(present(entry.attempt));
      if (field === "sequence") attempt.sequence = 2;
      if (field === "variation") attempt.variation.variationHash = "0".repeat(64);
      if (field === "actor") attempt.actor = "authenticated";
      if (field === "createdAt") attempt.createdAt = "2026-02-30T00:00:00.000Z";
      const { schema: _schema, attemptHash: _hash, ...values } = attempt;
      attempt.attemptHash =
        field === "attemptHash"
          ? "0".repeat(64)
          : hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values });
      Reflect.set(entry, "attempt", attempt);
      await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
        code:
          field === "sequence"
            ? "INVALID_VARIATION_COLLECTION"
            : field === "variation"
              ? "INVALID_VARIATION_LINEAGE"
              : field === "attemptHash"
                ? "VARIATION_HASH_MISMATCH"
                : "INVALID_VARIATION_PROVENANCE",
      });
    },
  );
  it("requires exact source/request and ordered collection/entry fields", async () => {
    const input = collectionFixture([]);
    const badRequest = { ...input, sourceRequest: undefined, selectedSequence: 99 };
    await expect(verifyVariationCollectionForNodeV1(badRequest)).rejects.toMatchObject({
      code: "INVALID_SOURCE_ADMISSION_REQUEST",
    });
    await expect(
      verifyVariationCollectionForNodeV1({ ...input, admitted: true }),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_COLLECTION" });
    const { sourceRequest, source: supplied, ...rest } = input;
    await expect(
      verifyVariationCollectionForNodeV1({ sourceRequest, source: supplied, ...rest }),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_COLLECTION" });
    Reflect.set(present(input.alternatives[0]), "extra", true);
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
      code: "INVALID_VARIATION_COLLECTION",
    });
  });
  it("rejects active history bound to a different valid source", async () => {
    const input = collectionFixture();
    const req = request();
    const other = await generator.generateCompleteSectionV1({
      ...req,
      composition: { ...req.composition, rootSeed: 1 },
    });
    Reflect.set(present(input.alternatives[1]), "history", createEditorHistoryV1(other));
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
      field: "collection.alternatives.1.history.source",
    });
  });
  it("snapshots the full closure and histories before async replay, with fresh admission on another call", async () => {
    const input = collectionFixture();
    const expected = JSON.stringify(input);
    const real = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    const replay = vi
      .spyOn(generator, "generateCompleteSectionV1")
      .mockImplementationOnce(async (r) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return real(r);
      });
    const pending = verifyVariationCollectionForNodeV1(input);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    input.selectedSequence = 99;
    input.alternatives.splice(1);
    release?.();
    const result = await pending;
    expect(JSON.stringify(result)).toBe(expected);
    const second = await verifyVariationCollectionForNodeV1(result);
    expect(second).toEqual(result);
    expect(second).not.toBe(result);
    expect(replay).toHaveBeenCalledTimes(2);
    expect(Object.isFrozen(input)).toBe(false);
  });
  it("rejects descriptor hooks before any replay, guards runtime first, and delegates once", async () => {
    const input = collectionFixture([]);
    const hook = vi.fn();
    Object.defineProperty(input, "selectedSequence", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toMatchObject({
      code: "INVALID_VARIATION_INPUT",
    });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toThrow(
      "requires Node 24.21.0",
    );
    expect(hook).not.toHaveBeenCalled();
    const failure = new Error("test full verifier unavailable");
    const delegate = vi
      .spyOn(compositionState, "verifyVariationCollectionV1")
      .mockRejectedValueOnce(failure);
    await expect(verifyVariationCollectionForNodeV1(input)).rejects.toBe(failure);
    expect(delegate).toHaveBeenCalledExactlyOnceWith(input);
  });
  it("propagates replay rejection without a partial collection or caller mutation", async () => {
    const input = collectionFixture();
    const expected = JSON.stringify(input);
    const failure = new Error("test replay failed");
    vi.spyOn(generator, "generateCompleteSectionV1").mockRejectedValueOnce(failure);
    const installed = vi.fn();
    const pending = verifyVariationCollectionForNodeV1(input);
    void pending.then(installed, () => undefined);
    await expect(pending).rejects.toBe(failure);
    expect(installed).not.toHaveBeenCalled();
    expect(JSON.stringify(input)).toBe(expected);
  });

  function expectedCollectionPreview(input: ReturnType<typeof collectionFixture>) {
    const selected = present(
      input.alternatives.find((entry) => entry.sequence === input.selectedSequence),
    );
    const revision = selectedEditorRevisionV1(selected.history);
    return {
      sourceResultHash: LITERAL_RESULT_HASH,
      section: revision.section,
      tracks: revision.tracks.map((track) => {
        const current =
          track.role === "arpeggiator" && selected.variation !== null
            ? present(selected.variation.tracks[2])
            : track;
        return {
          role: current.role,
          notes: current.notes.map(({ pitch, startTick, durationTicks }) => ({
            pitch,
            startTick,
            durationTicks,
          })),
        };
      }),
    };
  }
  it.each([0, 1, 2, 3])(
    "projects independent retained alternative %s with original source identity and exact three-field notes",
    async (selectedSequence) => {
      const input = { ...collectionFixture(), selectedSequence };
      const expected = expectedCollectionPreview(input);
      const saved = JSON.stringify(input);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const result = await projectRetainedVariationPreviewForNodeV1(input);
      expect(JSON.stringify(result)).toBe(JSON.stringify(expected));
      expect(result.sourceResultHash).toBe(LITERAL_RESULT_HASH);
      expect(Object.keys(result)).toEqual(["sourceResultHash", "section", "tracks"]);
      expect(result.tracks.map((track) => track.role)).toEqual([
        "harmony",
        "bass",
        "arpeggiator",
        "lead",
      ]);
      for (const track of result.tracks)
        for (const note of track.notes)
          expect(Object.keys(note)).toEqual(["pitch", "startTick", "durationTicks"]);
      expect(replay).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(input)).toBe(saved);
      expect(result.section).not.toBe(expected.section);
      frozen(result);
    },
  );
  it("keeps manually edited Lead geometry and target Arpeggiator separate from old editor proof material", async () => {
    // The literal seed-0 fixtures above intentionally permit identical output.
    // For this wiring challenge obtain a differing valid root from the already
    // reviewed upstream generator, never from the projection under test.
    const root = await generate(rootHistory(), 17);
    const input = collectionFixture(
      [pairOnly(expectedRoot(rootHistory()))],
      [literalMultiEditHistory()],
    );
    const entry = present(input.alternatives[1]);
    Reflect.set(entry, "variation", root.variation);
    Reflect.set(entry, "creationProof", root.creationProof);
    const values = {
      sequence: 1,
      variation: { schema: root.variation.schema, variationHash: root.variation.variationHash },
      actor: "local-producer-unverified",
      createdAt: "2026-10-11T20:00:00.000Z",
    };
    Reflect.set(entry, "attempt", {
      schema: "nightdrive.variation-attempt.v1",
      ...values,
      attemptHash: hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values }),
    });
    const result = await projectRetainedVariationPreviewForNodeV1(input);
    const expected = expectedCollectionPreview(input);
    expect(result.tracks[3]).toEqual(expected.tracks[3]);
    expect(result.tracks[2]).toEqual(expected.tracks[2]);
    const oldArp = selectedEditorRevisionV1(literalMultiEditHistory()).tracks[2];
    expect(result.tracks[2]?.notes).not.toEqual(
      oldArp?.notes.map(({ pitch, startTick, durationTicks }) => ({
        pitch,
        startTick,
        durationTicks,
      })),
    );
    expect(result.tracks[0]).toEqual(expected.tracks[0]);
    expect(result.tracks[1]).toEqual(expected.tracks[1]);
  });
  it("canonical velocity changes revision identity without changing any preview byte", async () => {
    const input = collectionFixture();
    const entry = present(input.alternatives[3]);
    const current = selectedEditorRevisionV1(entry.history);
    const target = present(present(current.tracks[3]).notes[0]);
    const edited = applyEditorCommandV1(entry.history, current, {
      schema: "nightdrive.editor-note-command.v7",
      type: "set-note-velocity",
      noteId: target.id,
      expectedVelocity: target.velocity,
      velocity: 73,
    });
    expect(selectedEditorRevisionV1(edited).revisionHash).not.toBe(current.revisionHash);
    const before = await projectRetainedVariationPreviewForNodeV1(input);
    Reflect.set(entry, "history", edited);
    const after = await projectRetainedVariationPreviewForNodeV1(input);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    expect(after.sourceResultHash).toBe(LITERAL_RESULT_HASH);
  });
  it("projects exact current Undo/Redo geometry within one retained alternative without navigating others", async () => {
    const history = pitchHistory();
    const input = collectionFixture([pairOnly(expectedRoot(rootHistory()))], [history]);
    const edited = await projectRetainedVariationPreviewForNodeV1(input);
    const entry = present(input.alternatives[1]);
    Reflect.set(entry, "history", present(undoEditorHistoryV1(history)));
    const undone = await projectRetainedVariationPreviewForNodeV1(input);
    expect(undone.tracks[3]?.notes[0]?.pitch).toBe(75);
    expect(edited.tracks[3]?.notes[0]?.pitch).toBe(74);
    expect(undone.tracks[2]).toEqual(edited.tracks[2]);
    Reflect.set(entry, "history", present(redoEditorHistoryV1(entry.history)));
    expect(await projectRetainedVariationPreviewForNodeV1(input)).toEqual(edited);
    expect(input.selectedSequence).toBe(1);
    expect(input.alternatives[0]?.history.cursor).toBe(0);
  });
  it("rejects a forged unselected proof and redo history rather than projecting only the active entry", async () => {
    const input = { ...collectionFixture(), selectedSequence: 0 };
    Reflect.set(present(input.alternatives[2]), "creationProof", null);
    await expect(projectRetainedVariationPreviewForNodeV1(input)).rejects.toMatchObject({
      code: "INVALID_VARIATION_LINEAGE",
    });
    const other = { ...collectionFixture(), selectedSequence: 0 };
    Reflect.set(present(other.alternatives[2]), "history", {
      ...forgedChild(pitchHistory()),
      cursor: 0,
    });
    await expect(projectRetainedVariationPreviewForNodeV1(other)).rejects.toMatchObject({
      code: "INVALID_EDITOR_LINEAGE",
    });
  });
  it("captures selection and complete data before async admission then re-admits on each later call", async () => {
    const input = collectionFixture();
    const expected = expectedCollectionPreview(input);
    const real = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    const replay = vi
      .spyOn(generator, "generateCompleteSectionV1")
      .mockImplementationOnce(async (r) => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return real(r);
      });
    const pending = projectRetainedVariationPreviewForNodeV1(input);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    input.selectedSequence = 0;
    input.alternatives.splice(1);
    release?.();
    expect(await pending).toEqual(expected);
    input.nextSequence = 1; // The later invocation receives a complete valid Original-only fixture.
    expect(await projectRetainedVariationPreviewForNodeV1(input)).toEqual(
      expectedCollectionPreview(input),
    );
    expect(replay).toHaveBeenCalledTimes(2);
  });
  it("delegates full proof once, propagates errors and exports no raw projection", async () => {
    const api = await import("./variation-application-node");
    expect(Object.keys(api).sort()).toEqual([
      "createRetainedArpeggiatorVariationApplicationForNodeV1",
      "editRetainedVariationApplicationForNodeV1",
      "projectRetainedVariationApplicationForNodeV1",
      "projectRetainedVariationPreviewForNodeV1",
      "redoRetainedVariationApplicationForNodeV1",
      "selectRetainedVariationApplicationForNodeV1",
      "undoRetainedVariationApplicationForNodeV1",
    ]);
    const input = collectionFixture([]);
    const failure = new Error("test verification unavailable");
    const delegate = vi
      .spyOn(compositionState, "verifyVariationCollectionV1")
      .mockRejectedValueOnce(failure);
    const installed = vi.fn();
    const pending = projectRetainedVariationPreviewForNodeV1(input);
    void pending.then(installed, () => undefined);
    await expect(pending).rejects.toBe(failure);
    expect(delegate).toHaveBeenCalledExactlyOnceWith(input);
    expect(installed).not.toHaveBeenCalled();
  });
  it("guards exact runtime before unsafe inputs without executing caller hooks", async () => {
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    const hook = vi.fn();
    const bad = Object.defineProperty({}, "source", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(projectRetainedVariationPreviewForNodeV1(bad)).rejects.toThrow(
      "requires Node 24.21.0",
    );
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });

  const creationMetadata = {
    actor: "local-producer-unverified",
    createdAt: "2026-10-12T03:00:00.000Z",
  };
  function creationInputs(input = collectionFixture([], [], pitchHistory())) {
    const selected = present(
      input.alternatives.find((entry) => entry.sequence === input.selectedSequence),
    );
    const expected = expectedRoot(selected.history, selected.variation);
    const editor = { ...expected.creationProof.parent.editor };
    return { input, expected, editor, proposal: structuredClone(expected.variation.request) };
  }
  const createAlternative = (
    v: ReturnType<typeof creationInputs>,
    metadata: unknown = creationMetadata,
  ) =>
    compositionState.createRetainedArpeggiatorAlternativeV1(
      v.input,
      v.input.selectedSequence,
      v.editor,
      v.proposal,
      metadata,
    );
  function independentAttempt(
    sequence: number,
    root: ReturnType<typeof expectedRoot>["variation"],
  ) {
    const values = {
      sequence,
      variation: { schema: root.schema, variationHash: root.variationHash },
      ...creationMetadata,
    };
    return {
      schema: "nightdrive.variation-attempt.v1",
      ...values,
      attemptHash: hash({ schema: "nightdrive.variation-attempt-hash-input.v1", ...values }),
    };
  }
  it.each(["original", "variation"])(
    "atomically creates a complete %s-parent alternative from independent root/attempt/state fixtures",
    async (kind) => {
      const v = creationInputs(
        kind === "original" ? collectionFixture([], [], pitchHistory()) : collectionFixture(),
      );
      const before = JSON.stringify(v.input);
      const parent = present(
        v.input.alternatives.find((entry) => entry.sequence === v.input.selectedSequence),
      );
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const result = await createAlternative(v);
      const child = present(result.collection.alternatives.at(-1));
      expect(child).toEqual({
        sequence: v.input.nextSequence,
        attempt: independentAttempt(v.input.nextSequence, v.expected.variation),
        variation: v.expected.variation,
        creationProof: v.expected.creationProof,
        history: parent.history,
      });
      expect(JSON.stringify(child.attempt)).toBe(
        JSON.stringify(independentAttempt(v.input.nextSequence, v.expected.variation)),
      );
      expect(result.state).toEqual(
        expectedRoot(parent.history, v.expected.variation).creationProof.parent,
      );
      expect(result.collection.alternatives.slice(0, -1)).toEqual(v.input.alternatives);
      expect(result.collection.selectedSequence).toBe(v.input.nextSequence);
      expect(result.collection.nextSequence).toBe(v.input.nextSequence + 1);
      expect(child.history).not.toBe(parent.history);
      expect(child.history.revisions).toHaveLength(parent.history.revisions.length);
      expect(child.history.cursor).toBe(parent.history.cursor);
      expect(child.creationProof?.parentHistory).not.toBe(child.history);
      expect(result.collection.source).toEqual(v.input.source);
      for (const role of ["harmony", "bass", "lead"] as const) {
        const index = result.state.tracks.findIndex((t) => t.role === role);
        expect(result.state.tracks[index]).toEqual(v.expected.creationProof.parent.tracks[index]);
        expect(result.state.trackHashes[role]).toBe(
          v.expected.creationProof.parent.trackHashes[role],
        );
      }
      expect(replay).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(v.input)).toBe(before);
      frozen(result);
      expect(await verifyVariationCollectionForNodeV1(result.collection)).toEqual(
        result.collection,
      );
      expect(replay).toHaveBeenCalledTimes(2); // Separate authoritative invocation re-admits.
    },
  );
  it("retains same-parent/seed/time duplicates with distinct sequences and independent redo proofs, then creates a verified descendant", async () => {
    const first = await createAlternative(creationInputs(collectionFixture([], [], rootHistory())));
    const redo = present(undoEditorHistoryV1(pitchHistory()));
    const next = {
      ...first.collection,
      alternatives: first.collection.alternatives.map((entry) =>
        entry.sequence === 0 ? { ...entry, history: redo } : entry,
      ),
      selectedSequence: 0,
    };
    const second = await createAlternative(
      creationInputs(next as unknown as ReturnType<typeof collectionFixture>),
    );
    const one = present(second.collection.alternatives[1]);
    const two = present(second.collection.alternatives[2]);
    expect(one.variation).toEqual(two.variation);
    expect(one.attempt?.createdAt).toBe(two.attempt?.createdAt);
    expect(one.attempt?.attemptHash).not.toBe(two.attempt?.attemptHash);
    expect(one.creationProof?.parentHistory.revisions).toHaveLength(1);
    expect(two.creationProof?.parentHistory.revisions).toHaveLength(2);
    expect(two.history).toEqual(redo);
    const third = await createAlternative(
      creationInputs(second.collection as unknown as ReturnType<typeof collectionFixture>),
    );
    expect(await verifyVariationCollectionForNodeV1(third.collection)).toEqual(third.collection);
    expect(third.collection.alternatives[2]?.creationProof).toEqual(two.creationProof);
    expect(third.collection.nextSequence).toBe(4);
  });
  it.each([
    ["missing-request", "INVALID_SOURCE_ADMISSION_REQUEST", "sourceRequest"],
    ["selection", "INVALID_VARIATION_COLLECTION", "expectedSelectedSequence"],
    ["combined", "STALE_VARIATION_PARENT", "request.parent"],
    ["editor", "STALE_EDITOR_PARENT", "expectedParent.revisionHash"],
    ["seed", "INVALID_VARIATION_SEED", "request.rootSeed"],
    ["next-sequence", "INVALID_VARIATION_COLLECTION", "collection.nextSequence"],
  ])("creation rejection preserves all state and precedence for %s", async (kind, code, field) => {
    const v = creationInputs();
    let sequence = v.input.selectedSequence;
    v.proposal.rootSeed = -1;
    if (kind === "missing-request") Reflect.set(v.input, "sourceRequest", null);
    if (kind === "selection") sequence = 9;
    if (kind === "combined") v.proposal.parent.stateHash = "0".repeat(64);
    if (kind === "editor") v.editor.revisionHash = "0".repeat(64);
    if (kind === "next-sequence") v.input.nextSequence = Number.MAX_SAFE_INTEGER;
    const before = JSON.stringify(v.input);
    const installed = vi.fn();
    const pending = compositionState.createRetainedArpeggiatorAlternativeV1(
      v.input,
      sequence,
      v.editor,
      v.proposal,
      { actor: "wrong", createdAt: "invalid" },
    );
    void pending.then(installed, () => undefined);
    await expect(pending).rejects.toMatchObject({ code, field });
    expect(installed).not.toHaveBeenCalled();
    expect(JSON.stringify(v.input)).toBe(before);
  });
  it.each(["extra", "missing", "reordered", "schema"])(
    "rejects %s expected editor identity before seed without partial application",
    async (kind) => {
      const v = creationInputs();
      const editor: Record<string, unknown> = { ...v.editor };
      if (kind === "extra") editor.extra = true;
      if (kind === "missing") delete editor.revisionHash;
      if (kind === "schema") editor.schema = "unsupported";
      const proposal =
        kind === "reordered"
          ? { revisionHash: v.editor.revisionHash, schema: v.editor.schema }
          : editor;
      v.proposal.rootSeed = -1;
      const before = JSON.stringify(v.input);
      const installed = vi.fn();
      const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      const pending = createRetainedArpeggiatorVariationApplicationForNodeV1(
        v.input,
        0,
        proposal,
        v.proposal,
      );
      void pending.then(installed, () => undefined);
      await expect(pending).rejects.toMatchObject({
        code: "INVALID_EDITOR_PARENT",
        field: "expectedParent",
      });
      expect(installed).not.toHaveBeenCalled();
      expect(target).not.toHaveBeenCalled();
      expect(JSON.stringify(v.input)).toBe(before);
    },
  );
  it("retains stale combined-parent precedence over malformed expected editor and seed", async () => {
    const v = creationInputs();
    v.proposal.parent.stateHash = "0".repeat(64);
    v.proposal.rootSeed = -1;
    await expect(
      createRetainedArpeggiatorVariationApplicationForNodeV1(
        v.input,
        0,
        { ...v.editor, extra: true },
        v.proposal,
      ),
    ).rejects.toMatchObject({ code: "STALE_VARIATION_PARENT", field: "request.parent" });
  });
  it.each([
    [{ actor: "wrong", createdAt: "invalid" }, "attempt.actor"],
    [{ ...creationMetadata, createdAt: "2026-02-30T03:00:00.000Z" }, "attempt.createdAt"],
    [{ ...creationMetadata, createdAt: "2026-10-12T03:00:00Z" }, "attempt.createdAt"],
    [{ ...creationMetadata, createdAt: "2026-10-12T03:00:00.000+00:00" }, "attempt.createdAt"],
  ])("rejects metadata before generating the new target: %j", async (metadata, field) => {
    const v = creationInputs();
    const target = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
    await expect(createAlternative(v, metadata)).rejects.toMatchObject({
      code: "INVALID_VARIATION_PROVENANCE",
      field,
    });
    expect(target).not.toHaveBeenCalled(); // Source replay uses its separate generator path.
  });
  it.each(["collection", "expectedEditor", "request", "metadata"])(
    "rejects unsafe %s descriptors before admission without invoking hooks",
    async (owner) => {
      const v = creationInputs();
      const hook = vi.fn();
      const unsafe = Object.defineProperty({}, "x", { get: hook, enumerable: true });
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const args: unknown[] = [v.input, 0, v.editor, v.proposal, creationMetadata];
      args[{ collection: 0, expectedEditor: 2, request: 3, metadata: 4 }[owner] ?? 0] = unsafe;
      await expect(
        compositionState.createRetainedArpeggiatorAlternativeV1(
          ...(args as [unknown, unknown, unknown, unknown, unknown]),
        ),
      ).rejects.toMatchObject({ code: "INVALID_VARIATION_INPUT" });
      expect(hook).not.toHaveBeenCalled();
      expect(replay).not.toHaveBeenCalled();
    },
  );
  it("captures all creation inputs before asynchronous admission", async () => {
    const v = creationInputs();
    const metadata = { ...creationMetadata };
    const expected = v.expected;
    const editor = { ...v.editor };
    let release: (() => void) | undefined;
    const real = generator.generateCompleteSectionV1;
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementationOnce(async (r) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(r);
    });
    const pending = createAlternative(v, metadata);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    v.input.alternatives.splice(0);
    v.proposal.rootSeed = -1;
    v.editor.revisionHash = "0".repeat(64);
    metadata.actor = "wrong";
    release?.();
    const result = await pending;
    expect(result.collection.alternatives[1]?.variation).toEqual(expected.variation);
    expect(result.collection.alternatives[1]?.attempt).toEqual(
      independentAttempt(1, expected.variation),
    );
    expect(result.state.editor).toEqual(editor);
  });
  it.each(["generation", "attempt-hash"])(
    "returns no partial success after %s failure",
    async (kind) => {
      const v = creationInputs();
      const before = JSON.stringify(v.input);
      const failure = new Error("fixture creation unavailable");
      if (kind === "generation") {
        vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1").mockRejectedValueOnce(
          failure,
        );
      } else {
        const real = digestAdapter.digestStage7CanonicalUtf8;
        vi.spyOn(digestAdapter, "digestStage7CanonicalUtf8").mockImplementation((value) => {
          if (value.startsWith('{"schema":"nightdrive.variation-attempt-hash-input.v1"'))
            throw failure;
          return real(value);
        });
      }
      const installed = vi.fn();
      const pending = createAlternative(v);
      void pending.then(installed, () => undefined);
      await expect(pending).rejects.toBe(failure);
      expect(installed).not.toHaveBeenCalled();
      expect(JSON.stringify(v.input)).toBe(before);
    },
  );
  it("Node application owns exact actor/UTC metadata and returns only complete identities/preview with one fresh admission", async () => {
    const v = creationInputs();
    const before = JSON.stringify(v.input);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(creationMetadata.createdAt));
    try {
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const result = await createRetainedArpeggiatorVariationApplicationForNodeV1(
        v.input,
        0,
        v.editor,
        v.proposal,
      );
      const state = expectedRoot(pitchHistory(), v.expected.variation).creationProof.parent;
      expect(result.selectedState).toEqual({ schema: state.schema, stateHash: state.stateHash });
      expect(result.selectedRevision).toEqual(state.editor);
      expect(result.collection.alternatives[1]?.attempt).toEqual(
        independentAttempt(1, v.expected.variation),
      );
      expect(result.preview).toEqual(
        expectedCollectionPreview(
          result.collection as unknown as ReturnType<typeof collectionFixture>,
        ),
      );
      expect(result.preview.sourceResultHash).toBe(LITERAL_RESULT_HASH);
      expect(Object.keys(present(result.preview.tracks[3]?.notes[0]))).toEqual([
        "pitch",
        "startTick",
        "durationTicks",
      ]);
      expect(replay).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(v.input)).toBe(before);
      frozen(result);
    } finally {
      vi.useRealTimers();
    }
  });
  it("Node application publishes nothing if final preview construction fails", async () => {
    const v = creationInputs();
    const state = v.expected.creationProof.parent;
    vi.spyOn(compositionState, "createRetainedArpeggiatorAlternativeV1").mockResolvedValueOnce({
      collection: { ...v.input, alternatives: [] } as unknown as Awaited<
        ReturnType<typeof compositionState.createRetainedArpeggiatorAlternativeV1>
      >["collection"],
      state: state as unknown as Awaited<
        ReturnType<typeof compositionState.createRetainedArpeggiatorAlternativeV1>
      >["state"],
    });
    const installed = vi.fn();
    const pending = createRetainedArpeggiatorVariationApplicationForNodeV1(
      v.input,
      0,
      v.editor,
      v.proposal,
    );
    void pending.then(installed, () => undefined);
    await expect(pending).rejects.toThrow("Verified variation selection is missing");
    expect(installed).not.toHaveBeenCalled();
  });
  it("both creation entry points reject wrong pinned runtime before caller hooks or delegation", async () => {
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    const hook = vi.fn();
    const unsafe = Object.defineProperty({}, "source", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(
      compositionState.createRetainedArpeggiatorAlternativeV1(unsafe, 0, null, null, null),
    ).rejects.toThrow("Node 24.21.0");
    await expect(
      createRetainedArpeggiatorVariationApplicationForNodeV1(unsafe, 0, null, null),
    ).rejects.toThrow("Node 24.21.0");
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });
  function contextInputs(input = collectionFixture()) {
    const entry = present(input.alternatives.find((v) => v.sequence === input.selectedSequence));
    const state = expectedRoot(entry.history, entry.variation).creationProof.parent;
    return {
      input,
      expectedState: { schema: state.schema, stateHash: state.stateHash },
      expectedEditor: { ...state.editor },
    };
  }
  const selectContext = (v: ReturnType<typeof contextInputs>, target: unknown) =>
    selectRetainedVariationApplicationForNodeV1(
      v.input,
      v.input.selectedSequence,
      v.expectedState,
      v.expectedEditor,
      target,
    );
  it.each([0, 1, 2, 3])(
    "restores exact retained context %s with independent identity/preview fixtures and no new attempt",
    async (target) => {
      const input = collectionFixture(
        closure(),
        [rootHistory(), pitchHistory(), present(undoEditorHistoryV1(pitchHistory()))],
        pitchHistory(),
      );
      const v = contextInputs(input);
      const entry = present(input.alternatives[target]);
      const expected = expectedRoot(entry.history, entry.variation).creationProof.parent;
      const before = JSON.stringify(input);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const aggregate = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      const clock = vi.spyOn(Date, "now");
      const result = await selectContext(v, target);
      expect(result.collection).toEqual({ ...input, selectedSequence: target });
      expect(result.selectedState).toEqual({
        schema: expected.schema,
        stateHash: expected.stateHash,
      });
      expect(result.selectedRevision).toEqual(expected.editor);
      expect(result.preview).toEqual(
        expectedCollectionPreview({ ...input, selectedSequence: target }),
      );
      expect(result.preview.sourceResultHash).toBe(LITERAL_RESULT_HASH);
      expect(result.collection.alternatives[target]?.history).toEqual(entry.history);
      expect(result.collection.alternatives[target]?.history).not.toBe(entry.history);
      expect(replay).toHaveBeenCalledTimes(1);
      expect(aggregate).toHaveBeenCalledTimes(3); // Retained ancestor verification only.
      expect(clock).not.toHaveBeenCalled();
      expect(JSON.stringify(input)).toBe(before);
      frozen(result);
    },
  );
  it("projects complete Original and varied application views with no fabricated parent or state authority", async () => {
    for (const input of [collectionFixture([], [], pitchHistory()), collectionFixture()]) {
      const v = contextInputs(input);
      const before = JSON.stringify(input);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const result = await projectRetainedVariationApplicationForNodeV1(input);
      expect(result.collection).toEqual(input);
      expect(result.selectedState).toEqual(v.expectedState);
      expect(result.selectedRevision).toEqual(v.expectedEditor);
      expect(result.preview).toEqual(expectedCollectionPreview(input));
      expect(JSON.stringify(input)).toBe(before);
      expect(replay).toHaveBeenCalledTimes(1);
      replay.mockRestore();
      frozen(result);
    }
  });
  it.each([
    ["selection", "INVALID_VARIATION_COLLECTION", "expectedSelectedSequence"],
    ["state", "STALE_VARIATION_PARENT", "expectedState"],
    ["state-extra", "INVALID_VARIATION_PARENT", "expectedState"],
    ["state-order", "INVALID_VARIATION_PARENT", "expectedState"],
    ["editor", "STALE_EDITOR_PARENT", "expectedParent.revisionHash"],
    ["editor-extra", "INVALID_EDITOR_PARENT", "expectedParent"],
    ["editor-order", "INVALID_EDITOR_PARENT", "expectedParent"],
    ["target", "INVALID_VARIATION_COLLECTION", "selection.sequence"],
  ])(
    "selection rejects %s before later errors without partial application",
    async (kind, code, field) => {
      const v = contextInputs();
      let sequence = v.input.selectedSequence;
      let state: unknown = v.expectedState;
      let editor: unknown = v.expectedEditor;
      if (kind === "selection") sequence = 8;
      if (kind === "state") state = { ...v.expectedState, stateHash: "0".repeat(64) };
      if (kind === "state-extra") state = { ...v.expectedState, extra: true };
      if (kind === "state-order")
        state = { stateHash: v.expectedState.stateHash, schema: v.expectedState.schema };
      if (kind === "editor") editor = { ...v.expectedEditor, revisionHash: "0".repeat(64) };
      if (kind === "editor-extra") editor = { ...v.expectedEditor, extra: true };
      if (kind === "editor-order")
        editor = { revisionHash: v.expectedEditor.revisionHash, schema: v.expectedEditor.schema };
      const before = JSON.stringify(v.input);
      const installed = vi.fn();
      const pending = selectRetainedVariationApplicationForNodeV1(
        v.input,
        sequence,
        state,
        editor,
        99,
      );
      void pending.then(installed, () => undefined);
      await expect(pending).rejects.toMatchObject({ code, field });
      expect(installed).not.toHaveBeenCalled();
      expect(JSON.stringify(v.input)).toBe(before);
    },
  );
  it.each([-1, 0.5, "1", Number.MAX_SAFE_INTEGER + 1, null])(
    "rejects unsupported target %j without repair",
    async (target) => {
      await expect(selectContext(contextInputs(), target)).rejects.toMatchObject({
        code: "INVALID_VARIATION_COLLECTION",
        field: "selection.sequence",
      });
    },
  );
  it.each(["projection", "selection"])(
    "%s verifies nonselected forged redo before restoring any context",
    async (operation) => {
      const v = contextInputs();
      Reflect.set(present(v.input.alternatives[0]), "history", {
        ...forgedChild(pitchHistory()),
        cursor: 0,
      });
      const pending =
        operation === "projection"
          ? projectRetainedVariationApplicationForNodeV1(v.input)
          : selectContext(v, 1);
      await expect(pending).rejects.toMatchObject({ code: "INVALID_EDITOR_LINEAGE" });
    },
  );
  it("rejects unsafe consumed selection input before admission without executing hooks", async () => {
    const v = contextInputs();
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    const hook = vi.fn();
    const unsafe = Object.defineProperty({}, "schema", { get: hook, enumerable: true });
    await expect(
      selectRetainedVariationApplicationForNodeV1(v.input, 3, unsafe, v.expectedEditor, 0),
    ).rejects.toMatchObject({ code: "INVALID_VARIATION_INPUT" });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });
  it("captures all selection inputs before asynchronous admission and restores the captured target", async () => {
    const v = contextInputs();
    const expected = expectedRoot(v.input.alternatives[0]?.history, null).creationProof.parent;
    const real = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementationOnce(async (r) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(r);
    });
    const pending = selectContext(v, 0);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    v.input.alternatives.splice(0);
    v.expectedState.stateHash = "0".repeat(64);
    v.expectedEditor.revisionHash = "0".repeat(64);
    release?.();
    const result = await pending;
    expect(result.collection.selectedSequence).toBe(0);
    expect(result.selectedState.stateHash).toBe(expected.stateHash);
    expect(result.selectedRevision).toEqual(expected.editor);
  });
  it("all current-context and selection entries guard pinned runtime before hooks", async () => {
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    const hook = vi.fn();
    const unsafe = Object.defineProperty({}, "source", { get: hook, enumerable: true });
    for (const pending of [
      compositionState.projectRetainedVariationContextV1(unsafe),
      compositionState.selectRetainedVariationContextV1(unsafe, 0, null, null, 0),
      projectRetainedVariationApplicationForNodeV1(unsafe),
      selectRetainedVariationApplicationForNodeV1(unsafe, 0, null, null, 0),
    ])
      await expect(pending).rejects.toThrow("Node 24.21.0");
    expect(hook).not.toHaveBeenCalled();
  });
  function editableContext() {
    return contextInputs(
      collectionFixture(closure(), [rootHistory(), rootHistory(), rootHistory()], rootHistory()),
    );
  }
  function contextCommand(version: number, history: EditorHistoryV1): EditorNoteCommand {
    const note = currentNote(history);
    switch (version) {
      case 1:
        return {
          schema: "nightdrive.editor-note-command.v1",
          type: "set-note-pitch",
          noteId: note.id,
          expectedPitch: note.pitch,
          pitch: 74,
        };
      case 2:
        return {
          schema: "nightdrive.editor-note-command.v2",
          type: "set-note-start-tick",
          noteId: note.id,
          expectedStartTick: note.startTick,
          startTick: 120,
        };
      case 3:
        return {
          schema: "nightdrive.editor-note-command.v3",
          type: "set-note-duration",
          noteId: note.id,
          expectedDurationTicks: note.durationTicks,
          durationTicks: 480,
        };
      case 4:
        return {
          schema: "nightdrive.editor-note-command.v4",
          type: "delete-note",
          noteId: note.id,
        };
      case 5:
        return {
          schema: "nightdrive.editor-note-command.v5",
          type: "set-note-position",
          noteId: note.id,
          expectedPitch: note.pitch,
          expectedStartTick: note.startTick,
          pitch: 74,
          startTick: 120,
        };
      case 6:
        return {
          schema: "nightdrive.editor-note-command.v6",
          type: "add-note",
          pitch: 72,
          startTick: 30000,
          durationTicks: 480,
        };
      case 7:
        return {
          schema: "nightdrive.editor-note-command.v7",
          type: "set-note-velocity",
          noteId: note.id,
          expectedVelocity: note.velocity,
          velocity: 73,
        };
      default:
        throw new Error("Unsupported test command");
    }
  }
  const editContext = (v: ReturnType<typeof contextInputs>, command: unknown) =>
    editRetainedVariationApplicationForNodeV1(
      v.input,
      v.input.selectedSequence,
      v.expectedState,
      v.expectedEditor,
      command,
    );
  const navigateContext = (v: ReturnType<typeof contextInputs>, direction: "undo" | "redo") =>
    (direction === "undo"
      ? undoRetainedVariationApplicationForNodeV1
      : redoRetainedVariationApplicationForNodeV1)(
      v.input,
      v.input.selectedSequence,
      v.expectedState,
      v.expectedEditor,
    );
  const nextContext = (
    application: Awaited<ReturnType<typeof projectRetainedVariationApplicationForNodeV1>>,
  ) => contextInputs(application.collection as unknown as ReturnType<typeof collectionFixture>);

  it.each([1, 2, 3, 4, 5, 6, 7])(
    "applies only selected Lead v%s through unchanged editor semantics with correct combined identity and preview",
    async (version) => {
      const v = editableContext();
      const parent = present(v.input.alternatives[3]);
      const command = contextCommand(version, parent.history);
      // v1 is an independently constructed literal revision/hash. Other versions
      // compare wrapper wiring with the unchanged, separately tested editor boundary.
      const expectedHistory =
        version === 1
          ? {
              source: parent.history.source,
              revisions: [revisionAt(parent.history, 0), literalPitchChild()],
              cursor: 1,
            }
          : apply(parent.history, command);
      const expected = expectedRoot(expectedHistory, parent.variation).creationProof.parent;
      const before = JSON.stringify(v.input);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      const aggregate = vi.spyOn(aggregateGenerator, "generateStage7ArpeggiatorAggregateV1");
      const delegate = vi.spyOn(editorBoundary, "applyEditorCommandV1");
      const result = await editContext(v, command);
      const selected = present(result.collection.alternatives[3]);
      expect(selected.history).toEqual(expectedHistory);
      expect(JSON.stringify(selected.history.revisions[1])).toBe(
        JSON.stringify(expectedHistory.revisions[1]),
      );
      expect(selected.history.cursor).toBe(1);
      expect(selected.history.revisions).toHaveLength(2); // v5 two axes: one child.
      expect(result.selectedState).toEqual({
        schema: expected.schema,
        stateHash: expected.stateHash,
      });
      expect(result.selectedRevision).toEqual(expected.editor);
      const expectedCollection = {
        ...v.input,
        alternatives: v.input.alternatives.map((entry) =>
          entry.sequence === 3 ? { ...entry, history: expectedHistory } : entry,
        ),
      };
      expect(result.preview).toEqual(expectedCollectionPreview(expectedCollection));
      expect(result.preview.sourceResultHash).toBe(LITERAL_RESULT_HASH);
      if (version === 7) expect(result.preview).toEqual(expectedCollectionPreview(v.input));
      expect(selected.variation).toEqual(parent.variation);
      expect(selected.creationProof).toEqual(parent.creationProof);
      expect(selected.attempt).toEqual(parent.attempt);
      expect(result.collection.alternatives.slice(0, 3)).toEqual(v.input.alternatives.slice(0, 3));
      expect(result.collection.nextSequence).toBe(v.input.nextSequence);
      expect(result.collection.source).toEqual(v.input.source);
      expect(delegate).toHaveBeenCalledExactlyOnceWith(
        expect.anything(),
        v.expectedEditor,
        command,
      );
      expect(replay).toHaveBeenCalledTimes(1);
      expect(aggregate).toHaveBeenCalledTimes(3); // Proof replay, no new variation.
      expect(JSON.stringify(v.input)).toBe(before);
      frozen(result);
    },
  );
  it.each([0, 3])(
    "restores exact editor and combined hashes with Undo/Redo in context %s, without switching alternatives",
    async (sequence) => {
      const v = editableContext();
      v.input.selectedSequence = sequence;
      const current = contextInputs(v.input);
      const command = contextCommand(1, present(current.input.alternatives[sequence]).history);
      const edited = await editContext(current, command);
      const undone = present(await navigateContext(nextContext(edited), "undo"));
      expect(undone.selectedState).toEqual(current.expectedState);
      expect(undone.selectedRevision).toEqual(current.expectedEditor);
      expect(undone.preview).toEqual(expectedCollectionPreview(current.input));
      expect(undone.collection.selectedSequence).toBe(sequence);
      expect(undone.collection.alternatives[sequence]?.history.revisions).toHaveLength(2);
      const redone = present(await navigateContext(nextContext(undone), "redo"));
      expect(redone.selectedState).toEqual(edited.selectedState);
      expect(redone.selectedRevision).toEqual(edited.selectedRevision);
      expect(redone.preview).toEqual(edited.preview);
      expect(redone.collection).toEqual(edited.collection);
    },
  );
  it.each(["undo", "redo"] as const)(
    "returns null for bounded %s after context proof, without creating an alternative or revision",
    async (direction) => {
      const v = editableContext();
      const before = JSON.stringify(v.input);
      const replay = vi.spyOn(generator, "generateCompleteSectionV1");
      expect(await navigateContext(v, direction)).toBeNull();
      expect(replay).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(v.input)).toBe(before);
    },
  );
  it("edits both undone active histories without losing the child-owned creation revision proof", async () => {
    const history = pitchHistory();
    const proof = pairOnly(expectedRoot(history));
    const undone = present(undoEditorHistoryV1(history));
    const input = collectionFixture([proof], [undone], undone);
    const v = contextInputs(input);
    const childEdit = { ...contextCommand(1, undone), pitch: 72 };
    const child = await editContext(v, childEdit);
    const selectedOriginal = await selectContext(nextContext(child), 0);
    const originalEdit = { ...contextCommand(1, undone), pitch: 73 };
    const result = await editContext(nextContext(selectedOriginal), originalEdit);
    const creationHash = selectedEditorRevisionV1(history).revisionHash;
    for (const entry of result.collection.alternatives) {
      expect(entry.history.revisions.some((r) => r.revisionHash === creationHash)).toBe(false);
      expect(entry.history.revisions).toHaveLength(2);
      expect(entry.history.cursor).toBe(1);
    }
    expect(result.collection.alternatives[1]?.creationProof).toEqual(proof.creationProof);
    expect(
      result.collection.alternatives[1]?.creationProof?.parentHistory.revisions.some(
        (r) => r.revisionHash === creationHash,
      ),
    ).toBe(true);
    expect(result.collection.alternatives[1]?.variation).toEqual(proof.variation);
    expect(input.alternatives[0]?.history).toEqual(undone);
    expect(await projectRetainedVariationApplicationForNodeV1(result.collection)).toEqual(result);
  });
  it.each(["selection", "combined", "editor"])(
    "preserves %s ownership precedence over an invalid editor command",
    async (kind) => {
      const v = editableContext();
      let sequence = v.input.selectedSequence;
      if (kind === "selection") sequence = 0;
      if (kind === "combined") v.expectedState.stateHash = "0".repeat(64);
      if (kind === "editor") v.expectedEditor.revisionHash = "0".repeat(64);
      const delegate = vi.spyOn(editorBoundary, "applyEditorCommandV1");
      await expect(
        editRetainedVariationApplicationForNodeV1(
          v.input,
          sequence,
          v.expectedState,
          v.expectedEditor,
          {},
        ),
      ).rejects.toMatchObject({
        code: {
          selection: "INVALID_VARIATION_COLLECTION",
          combined: "STALE_VARIATION_PARENT",
          editor: "STALE_EDITOR_PARENT",
        }[kind],
      });
      expect(delegate).not.toHaveBeenCalled();
    },
  );
  it.each(["undo", "redo"] as const)(
    "%s checks exact current ownership before navigation",
    async (direction) => {
      const v = editableContext();
      v.expectedEditor.revisionHash = "0".repeat(64);
      await expect(navigateContext(v, direction)).rejects.toMatchObject({
        code: "STALE_EDITOR_PARENT",
      });
    },
  );
  it.each(["no-op", "stale-value", "schema"])(
    "propagates unchanged editor %s rejection without partial application",
    async (kind) => {
      const v = editableContext();
      const command = contextCommand(1, present(v.input.alternatives[3]).history);
      if (kind === "no-op") Reflect.set(command, "pitch", 75);
      if (kind === "stale-value") Reflect.set(command, "expectedPitch", 74);
      if (kind === "schema") Reflect.set(command, "schema", "unsupported");
      const before = JSON.stringify(v.input);
      const installed = vi.fn();
      const pending = editContext(v, command);
      void pending.then(installed, () => undefined);
      await expect(pending).rejects.toMatchObject({
        code: {
          "no-op": "NO_OP_EDITOR_COMMAND",
          "stale-value": "STALE_EDITOR_NOTE_VALUE",
          schema: "UNSUPPORTED_EDITOR_COMMAND_SCHEMA",
        }[kind],
      });
      expect(installed).not.toHaveBeenCalled();
      expect(JSON.stringify(v.input)).toBe(before);
    },
  );
  it("rejects nonselected forged redo before dispatching a selected edit", async () => {
    const v = editableContext();
    const command = contextCommand(1, present(v.input.alternatives[3]).history);
    Reflect.set(present(v.input.alternatives[0]), "history", {
      ...forgedChild(pitchHistory()),
      cursor: 0,
    });
    const delegate = vi.spyOn(editorBoundary, "applyEditorCommandV1");
    await expect(editContext(v, command)).rejects.toMatchObject({ code: "INVALID_EDITOR_LINEAGE" });
    expect(delegate).not.toHaveBeenCalled();
  });
  it("snapshots command/context before admission and ignores subsequent caller mutation", async () => {
    const v = editableContext();
    const command = contextCommand(1, present(v.input.alternatives[3]).history);
    const real = generator.generateCompleteSectionV1;
    let release: (() => void) | undefined;
    vi.spyOn(generator, "generateCompleteSectionV1").mockImplementationOnce(async (r) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(r);
    });
    const pending = editContext(v, command);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    Reflect.set(command, "pitch", 80);
    v.input.alternatives.splice(0);
    v.expectedState.stateHash = "0".repeat(64);
    release?.();
    const result = await pending;
    expect(result.collection.alternatives[3]?.history.revisions[1]).toEqual(literalPitchChild());
  });
  it("rejects unsafe command descriptors before admission without hooks", async () => {
    const v = editableContext();
    const hook = vi.fn();
    const command = Object.defineProperty({}, "schema", { get: hook, enumerable: true });
    const replay = vi.spyOn(generator, "generateCompleteSectionV1");
    await expect(editContext(v, command)).rejects.toMatchObject({
      code: "INVALID_VARIATION_INPUT",
    });
    expect(hook).not.toHaveBeenCalled();
    expect(replay).not.toHaveBeenCalled();
  });
  it("returns no partial application if the existing editor delegate fails", async () => {
    const v = editableContext();
    const command = contextCommand(1, present(v.input.alternatives[3]).history);
    const before = JSON.stringify(v.input);
    const failure = new Error("test editor unavailable");
    vi.spyOn(editorBoundary, "applyEditorCommandV1").mockImplementationOnce(() => {
      throw failure;
    });
    const installed = vi.fn();
    const pending = editContext(v, command);
    void pending.then(installed, () => undefined);
    await expect(pending).rejects.toBe(failure);
    expect(installed).not.toHaveBeenCalled();
    expect(JSON.stringify(v.input)).toBe(before);
  });
  it("fails closed on a combined-ID collision after a delegated edit", async () => {
    const v = editableContext();
    const selected = present(v.input.alternatives[3]);
    const command = contextCommand(1, selected.history);
    const forged = structuredClone(selected.history);
    const collision = present(selected.variation?.tracks[2]?.notes[0]).id;
    Reflect.set(present(forged.revisions[0]?.tracks[3]?.notes[0]), "id", collision);
    vi.spyOn(editorBoundary, "applyEditorCommandV1").mockReturnValueOnce(forged);
    await expect(editContext(v, command)).rejects.toMatchObject({
      code: "VARIATION_NOTE_ID_COLLISION",
    });
  });
  it("all contextual editor entries reject wrong runtime before caller hooks", async () => {
    Object.defineProperty(process.versions, "node", { configurable: true, value: "24.20.0" });
    const hook = vi.fn();
    const unsafe = Object.defineProperty({}, "source", { get: hook, enumerable: true });
    const operations = [
      () => compositionState.editRetainedVariationContextV1(unsafe, 0, null, null, {}),
      () => compositionState.undoRetainedVariationContextV1(unsafe, 0, null, null),
      () => compositionState.redoRetainedVariationContextV1(unsafe, 0, null, null),
      () => editRetainedVariationApplicationForNodeV1(unsafe, 0, null, null, {}),
      () => undoRetainedVariationApplicationForNodeV1(unsafe, 0, null, null),
      () => redoRetainedVariationApplicationForNodeV1(unsafe, 0, null, null),
    ];
    for (const operation of operations) await expect(operation()).rejects.toThrow("Node 24.21.0");
    expect(hook).not.toHaveBeenCalled();
  });
});
