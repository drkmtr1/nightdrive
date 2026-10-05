import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  COMPLETE_SECTION_ENGINE_VERSION_V1,
  COMPLETE_SECTION_GENERATOR_VERSION_V1,
  COMPLETE_SECTION_REQUEST_SCHEMA_V1,
} from "../composition/complete-section";
import {
  createChildEditorRevisionV1,
  EDITOR_COMMAND_SCHEMA_V1,
  EDITOR_COMMAND_SCHEMA_V5,
  type EditorRevisionV1,
  type EditorTrackV1,
  type EditorValueError,
  importCompleteSectionAsEditorRootV1,
  serializeEditorRevisionV1,
  type SetNotePositionCommandV5,
  verifyEditorRevisionV1,
} from "../composition/editor-revision";
import { generateCompleteSectionV1 } from "../generators/complete-section";
import {
  ARP_POLICY_VERSION_V2,
  ARP_PROFILE_DATA_VERSION_V2,
} from "../music-domain/arpeggiator-policy-configuration";
import { COMPONENT_SEED_DERIVATION_VERSION_V1 } from "../music-domain/component-seed";
import { HARMONY_PROFILE_IDS } from "../music-domain/harmony";
import { MOTIF_POLICY_VERSION_V1 } from "../music-domain/motif-policy";
import { MOTIF_PROFILE_DATA_VERSION_V1 } from "../music-domain/motif-profile-configuration";
import { MOTIF_GENERATOR_VERSION_V1 } from "../music-domain/motif-result";
import { PRNG_ALGORITHM_ID } from "../music-domain/prng";
import {
  applyEditorCommandV1,
  createEditorHistoryV1,
  redoEditorHistoryV1,
  selectedEditorRevisionV1,
  undoEditorHistoryV1,
} from "./editor-history";

const request = {
  schema: COMPLETE_SECTION_REQUEST_SCHEMA_V1,
  engineVersion: COMPLETE_SECTION_ENGINE_VERSION_V1,
  generatorVersion: COMPLETE_SECTION_GENERATOR_VERSION_V1,
  composition: {
    schema: "nightdrive.first-playable-composition-request.v1",
    engineVersion: "nightdrive.engine.first-playable-composition.v1",
    generatorVersion: "nightdrive.generator.first-playable-composition.v1",
    profile: { id: HARMONY_PROFILE_IDS.darkSynthwave },
    harmony: {
      templateId: "degree-0654-natural-minor-v1",
      templateVersion: "v1",
      key: { tonic: 0, scale: "natural-minor" },
    },
    section: { tempo: { microsecondsPerQuarter: 500_000 } },
    intent: { energy: "medium", complexity: "medium" },
    rootSeed: 0,
    arpeggiator: {
      range: { minMidiPitch: 36, maxMidiPitch: 84 },
      profile: { version: ARP_PROFILE_DATA_VERSION_V2 },
      policy: { version: ARP_POLICY_VERSION_V2 },
      seedDerivation: { version: COMPONENT_SEED_DERIVATION_VERSION_V1 },
      prng: { version: PRNG_ALGORITHM_ID },
    },
  },
  motif: {
    schema: "nightdrive.motif-generation-request.v1",
    generatorVersion: MOTIF_GENERATOR_VERSION_V1,
    profile: { version: MOTIF_PROFILE_DATA_VERSION_V1 },
    policyVersion: MOTIF_POLICY_VERSION_V1,
  },
} as const;

// Literal root/child bytes are independently pinned to the reviewed complete-section
// fixture in src/web/complete-section-preview-node.test.ts (PR #275).
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
const EXPECTED_START_TICK_CHILD_JSON = [
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
  'e2baeaeb213560536422465a0742b27bb4775fd65cfafad12","pitch":75,"startTick":480,"durationTicks":960,"velocity":100},{"id":"note-75336952f6892dec0e5639925cb4c8a53042a44f2d26d758ffc0acab48da0256","pitch":79,"startTick":1920,"durationTicks":960,',
  '"velocity":100},{"id":"note-10bf8e66b608c601832a0d7300e9dc8ddc79b3912e62ab99f3ee62a6d726070e","pitch":79,"startTick":3840,"durationTicks":960,"velocity":100},{"id":"note-b2e57d31534569a7221590b00c568858a43cebf342891ed553ac909781c32949","pit',
  'ch":75,"startTick":5760,"durationTicks":960,"velocity":100},{"id":"note-ca155676c53627d2b26dc4e658a3af7672a679ca65356a0461711d8cd0987e94","pitch":74,"startTick":7680,"durationTicks":960,"velocity":100},{"id":"note-04b0dc531d95015009321aecc6',
  '417905212cab6192e8d664e5078d91958a498b","pitch":77,"startTick":9600,"durationTicks":960,"velocity":100},{"id":"note-359a61bc8734bd8f32c4bcce88297282167c0c8c47b47809b0925173dedaa4a4","pitch":77,"startTick":11520,"durationTicks":960,"velocity',
  '":100},{"id":"note-19be83a377ef7f51540382bfe18b7d6ade71c26cd5fcf59851f260430ab627d3","pitch":74,"startTick":13440,"durationTicks":960,"velocity":100},{"id":"note-cf7e3f10e02a3b897e59cc903c0775024fbc5b1bc8f7c277623fc32a18ac1aae","pitch":80,"',
  'startTick":15360,"durationTicks":960,"velocity":100},{"id":"note-796ddbb17be634cd4ee244f6460c18b30ff5102b19541c1e634ca380083e0302","pitch":84,"startTick":17280,"durationTicks":960,"velocity":100},{"id":"note-56673b22e001b6258321c78841000120',
  'c2172858843b4007109acbdfa2791475","pitch":84,"startTick":19200,"durationTicks":960,"velocity":100},{"id":"note-aa75e6b6a98279d2f5006efce209001f5de3a00bed54541f5d96f269fea034e5","pitch":80,"startTick":21120,"durationTicks":960,"velocity":100',
  '},{"id":"note-79a5988c212a6bd7cabec30727697e08edc69b20a2ba71bfef23497d95b0db57","pitch":79,"startTick":23040,"durationTicks":960,"velocity":100},{"id":"note-172c93319bc926592b100ad7b2979e7c207a7e74d5d8aa84ddde161d9d1b5d91","pitch":79,"start',
  'Tick":24960,"durationTicks":960,"velocity":100},{"id":"note-231e345a44e8e3c5d3b20be7cb7c889ea137f390da13802ac93a8f6d34bca3c4","pitch":79,"startTick":26880,"durationTicks":960,"velocity":100},{"id":"note-d6ef221c507b37078303382a750bed292271d',
  '7096bdb642a6c518f2a888d7dad","pitch":74,"startTick":28800,"durationTicks":960,"velocity":100}]}],"parent":{"schema":"nightdrive.editor-revision.v1","revisionHash":"f4a0d793b5e20f99df0ddb3ee028cd7b3d2592613a358f7052387d7fe009f404"},"command"',
  ':{"schema":"nightdrive.editor-note-command.v2","type":"set-note-start-tick","noteId":"note-853ab61d8567f96e2baeaeb213560536422465a0742b27bb4775fd65cfafad12","expectedStartTick":0,"startTick":480},"revisionHash":"5881c8de981cd13fe15d7b2e4a92',
  '32ad75548e1e44d02b76151c151a1c9f0edc"}',
].join("");
const EXPECTED_START_TICK_SOURCE_HASH =
  "0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1";
const EXPECTED_START_TICK_ROOT_HASH =
  "f4a0d793b5e20f99df0ddb3ee028cd7b3d2592613a358f7052387d7fe009f404";
const EXPECTED_START_TICK_CHILD_HASH =
  "5881c8de981cd13fe15d7b2e4a9232ad75548e1e44d02b76151c151a1c9f0edc";
const EXPECTED_FIRST_LEAD_NOTE_ID_INPUT =
  '{"schema":"nightdrive.editor-note-id-input.v1","source":{"schema":"nightdrive.complete-section-result.v1","resultHash":"0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1"},"role":"lead","ordinal":0}';
const EXPECTED_FIRST_LEAD_NOTE_ID =
  "note-853ab61d8567f96e2baeaeb213560536422465a0742b27bb4775fd65cfafad12";

async function history() {
  return createEditorHistoryV1(await generateCompleteSectionV1(request as never));
}

function startTickCommand(revision: EditorRevisionV1, noteIndex: number, startTick: number) {
  const note = revision.tracks[3]?.notes[noteIndex];
  if (!note) throw new Error("Missing Lead note fixture.");
  return {
    schema: "nightdrive.editor-note-command.v2" as const,
    type: "set-note-start-tick" as const,
    noteId: note.id,
    expectedStartTick: note.startTick,
    startTick,
  };
}
function durationCommand(revision: EditorRevisionV1, noteIndex: number, durationTicks: number) {
  const note = revision.tracks[3]?.notes[noteIndex];
  if (!note) throw new Error("Missing Lead note fixture.");
  return {
    schema: "nightdrive.editor-note-command.v3" as const,
    type: "set-note-duration" as const,
    noteId: note.id,
    expectedDurationTicks: note.durationTicks,
    durationTicks,
  };
}
function positionCommand(
  revision: EditorRevisionV1,
  noteIndex: number,
  pitch: number,
  startTick: number,
): SetNotePositionCommandV5 {
  const note = revision.tracks[3]?.notes[noteIndex];
  if (!note) throw new Error("Missing Lead note fixture.");
  return {
    schema: EDITOR_COMMAND_SCHEMA_V5,
    type: "set-note-position",
    noteId: note.id,
    expectedPitch: note.pitch,
    expectedStartTick: note.startTick,
    pitch,
    startTick,
  };
}
function sha256Utf8(value: string): string {
  return createHash("sha256").update(Buffer.from(value, "utf8")).digest("hex");
}

function independentRevisionHashInput(canonicalJson: string): string {
  const { revisionHash: _revisionHash, ...revision } = JSON.parse(
    canonicalJson,
  ) as EditorRevisionV1;
  return JSON.stringify({ schema: "nightdrive.editor-revision-hash-input.v1", revision });
}
type SourceEvent = Readonly<{ pitch: number; startTick: number; durationTicks: number }>;

// Literal events reuse the independent complete-section fixture at
// src/web/complete-section-preview-node.test.ts, traced to PR #275.
const EXPECTED_SOURCE_EVENTS: readonly Readonly<{
  role: EditorTrackV1["role"];
  notes: readonly SourceEvent[];
}>[] = [
  {
    role: "harmony",
    notes: [
      [36, 39, 43],
      [38, 41, 46],
      [36, 39, 44],
      [38, 43, 47],
    ].flatMap((pitches, slot) =>
      pitches.map((pitch) => ({ pitch, startTick: slot * 7680, durationTicks: 7680 })),
    ),
  },
  {
    role: "bass",
    notes: [48, 46, 44, 43].map((pitch, slot) => ({
      pitch,
      startTick: slot * 7680,
      durationTicks: 7680,
    })),
  },
  {
    role: "arpeggiator",
    notes: [
      [55, 51, 43, 39, 36, 51, 48, 43, 36, 55, 51, 43],
      [58, 53, 46, 41, 38, 53, 50, 46, 38, 58, 53, 46],
      [56, 51, 44, 39, 36, 51, 48, 44, 36, 56, 51, 44],
      [59, 55, 47, 43, 38, 55, 50, 47, 38, 59, 55, 47],
    ].flatMap((pitches, slot) =>
      pitches.map((pitch, index) => {
        const offset = [0, 480, 1440, 1920, 2400, 3360, 3840, 4320, 5280, 5760, 6240, 7200][index];
        if (offset === undefined) throw new Error("Missing independent Arpeggiator onset.");
        return { pitch, startTick: slot * 7680 + offset, durationTicks: 360 };
      }),
    ),
  },
  {
    role: "lead",
    notes: [75, 79, 79, 75, 74, 77, 77, 74, 80, 84, 84, 80, 79, 79, 79, 74].map((pitch, index) => ({
      pitch,
      startTick: index * 1920,
      durationTicks: 960,
    })),
  },
];

function independentRootRevision(): EditorRevisionV1 {
  const content: Omit<EditorRevisionV1, "revisionHash"> = {
    schema: "nightdrive.editor-revision.v1",
    source: {
      schema: "nightdrive.complete-section-result.v1",
      resultHash: EXPECTED_START_TICK_SOURCE_HASH,
    },
    section: {
      ppq: 960,
      barCount: 8,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: { microsecondsPerQuarter: 500000 },
      endTick: 30720,
    },
    tracks: EXPECTED_SOURCE_EVENTS.map(({ role, notes }) => ({
      role,
      notes: notes.map((event, ordinal) => ({
        id:
          "note-" +
          sha256Utf8(
            JSON.stringify({
              schema: "nightdrive.editor-note-id-input.v1",
              source: {
                schema: "nightdrive.complete-section-result.v1",
                resultHash: EXPECTED_START_TICK_SOURCE_HASH,
              },
              role,
              ordinal,
            }),
          ),
        ...event,
        velocity: 100,
      })),
    })),
    parent: null,
    command: null,
  };
  return independentlyHashedRevision(content);
}

function independentlyHashedRevision(
  content: Omit<EditorRevisionV1, "revisionHash">,
): EditorRevisionV1 {
  return {
    ...content,
    revisionHash: sha256Utf8(
      JSON.stringify({
        schema: "nightdrive.editor-revision-hash-input.v1",
        revision: content,
      }),
    ),
  };
}

function independentStartTickChild(root: EditorRevisionV1): EditorRevisionV1 {
  const target = root.tracks[3]?.notes[0];
  if (!target) throw new Error("Missing independent Lead fixture.");
  const content: Omit<EditorRevisionV1, "revisionHash"> = {
    schema: root.schema,
    source: root.source,
    section: root.section,
    tracks: root.tracks.map((track) =>
      track.role !== "lead"
        ? track
        : {
            role: "lead",
            notes: track.notes.map((note, index) =>
              index === 0 ? { ...note, startTick: 480 } : note,
            ),
          },
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: {
      schema: "nightdrive.editor-note-command.v2",
      type: "set-note-start-tick",
      noteId: target.id,
      expectedStartTick: 0,
      startTick: 480,
    },
  };
  return independentlyHashedRevision(content);
}

function independentDeleteChild(root: EditorRevisionV1, deleteIndex: number): EditorRevisionV1 {
  const target = root.tracks[3]?.notes[deleteIndex];
  if (!target) throw new Error("Missing independent deletion target.");
  const content: Omit<EditorRevisionV1, "revisionHash"> = {
    schema: root.schema,
    source: root.source,
    section: root.section,
    tracks: root.tracks.map((track) =>
      track.role !== "lead"
        ? track
        : { role: "lead", notes: track.notes.filter((_, index) => index !== deleteIndex) },
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: target.id,
    },
  };
  return independentlyHashedRevision(content);
}

function independentDurationChild(root: EditorRevisionV1): EditorRevisionV1 {
  const target = root.tracks[3]?.notes[0];
  if (!target) throw new Error("Missing independent Lead fixture.");
  const content: Omit<EditorRevisionV1, "revisionHash"> = {
    schema: root.schema,
    source: root.source,
    section: root.section,
    tracks: root.tracks.map((track) =>
      track.role !== "lead"
        ? track
        : {
            role: "lead",
            notes: track.notes.map((note, index) =>
              index === 0 ? { ...note, durationTicks: 1440 } : note,
            ),
          },
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: {
      schema: "nightdrive.editor-note-command.v3",
      type: "set-note-duration",
      noteId: target.id,
      expectedDurationTicks: 960,
      durationTicks: 1440,
    },
  };
  return independentlyHashedRevision(content);
}

function independentPositionChild(
  root: EditorRevisionV1,
  targetIndex: number,
  pitch: number,
  startTick: number,
): EditorRevisionV1 {
  const target = root.tracks[3]?.notes[targetIndex];
  if (!target) throw new Error("Missing independent Lead position fixture.");
  const content: Omit<EditorRevisionV1, "revisionHash"> = {
    schema: root.schema,
    source: root.source,
    section: root.section,
    tracks: root.tracks.map((track) =>
      track.role !== "lead"
        ? track
        : {
            role: "lead",
            notes: track.notes.map((note, index) =>
              index === targetIndex ? { ...note, pitch, startTick } : note,
            ),
          },
    ),
    parent: { schema: root.schema, revisionHash: root.revisionHash },
    command: {
      schema: "nightdrive.editor-note-command.v5",
      type: "set-note-position",
      noteId: target.id,
      expectedPitch: target.pitch,
      expectedStartTick: target.startTick,
      pitch,
      startTick,
    },
  };
  return independentlyHashedRevision(content);
}

const EXPECTED_DURATION_COMMAND_JSON =
  '{"schema":"nightdrive.editor-note-command.v3","type":"set-note-duration","noteId":"note-853ab61d8567f96e2baeaeb213560536422465a0742b27bb4775fd65cfafad12","expectedDurationTicks":960,"durationTicks":1440}';
const EXPECTED_DURATION_CHILD_HASH =
  "274f66a023e76d9d33403c34b203a03f0c50d492ba7680f6685dbc9a348a2dbd";
const EXPECTED_DELETE_COMMAND_JSON =
  '{"schema":"nightdrive.editor-note-command.v4","type":"delete-note","noteId":"note-19be83a377ef7f51540382bfe18b7d6ade71c26cd5fcf59851f260430ab627d3"}';
const EXPECTED_DELETE_ROOT_HASH =
  "f4a0d793b5e20f99df0ddb3ee028cd7b3d2592613a358f7052387d7fe009f404";
const EXPECTED_DELETE_CHILD_HASH =
  "e34fb29d0fded6510c7bfdd89e5f20a64b966d954b8fd7cf923ef3d683624158";
const EXPECTED_DELETE_HASH_INPUT_BYTES = 12070;
const EXPECTED_DELETE_ROOT_JSON = [
  '{"schema":"nightdrive.editor-revision.v1","source":{"schema":"nightdrive.complete-section-result.v1","resultHash":"0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1"},"section":{"ppq":960,"barCount":8,"tim',
  'eSignature":{"numerator":4,"denominator":4},"tempo":{"microsecondsPerQuarter":500000},"endTick":30720},"tracks":[{"role":"harmony","notes":[{"id":"note-ac1c9eb06bed77f88dec61692b3af0c81bda84ad492782a7f2c020857901bdcd","p',
  'itch":36,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-95f0adb50ce99cce670392eef99aa823b163a70b4c8a588f4f70b2b3a403a4f9","pitch":39,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-16f99431',
  'd5cc757bd0d0a0e13568a7f17b1d51e9f027998e04ca61663654f273","pitch":43,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-68f7f26ed057ebfb9c8ecdb3de293fce0d417a55e7f3da02ee23406902401d9e","pitch":38,"startTick"',
  ':7680,"durationTicks":7680,"velocity":100},{"id":"note-88e878d68ae66e19ca0809692e4ecf15c4250d04d64a51a415df45622a75fe65","pitch":41,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-b2bbe7a5ca268e9983c80e',
  '6b0842de3900d792a9cfad3a26647f93d5e1e0ef57","pitch":46,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-59e895d00d90fdb39e6da3f1b14ffce7c04b1289475ddd5167bd1c57480e7029","pitch":36,"startTick":15360,"dur',
  'ationTicks":7680,"velocity":100},{"id":"note-bc38b0d452a8056301103f0c2df5d9fa888f9d5bacc3b347cdc5e76f6c6a9443","pitch":39,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-77a66c1573544ae87d81718986dc176',
  '84c34fa26638f05f73b368f5889105281","pitch":44,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-1dee2ea1dc8f7f8eb74e121a53d9884097dfb5046d1c6b88619f8f7225d87e66","pitch":38,"startTick":23040,"durationTic',
  'ks":7680,"velocity":100},{"id":"note-6abba983e4d542bc61950e6e88a4cfee3161144ebe5fa668810e23d57783a544","pitch":43,"startTick":23040,"durationTicks":7680,"velocity":100},{"id":"note-230619546a23728894e7c339b5206a942529ae9',
  'a241bfe8a51e88bd4c010a18c","pitch":47,"startTick":23040,"durationTicks":7680,"velocity":100}]},{"role":"bass","notes":[{"id":"note-ccb88aeb3025001af53f2bf73a50e3a68f4c6e1f94d675d46385464d8a45814f","pitch":48,"startTick":',
  '0,"durationTicks":7680,"velocity":100},{"id":"note-9f4b62fac9836ee0b5e4fcc6585e294173afde0322f3b0ea03b8cabd79ceae45","pitch":46,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-a84f91e4cf6b2f566e6ffdcc99',
  '68b0de74740a9552d258b5d14e8a4e415d935c","pitch":44,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-d27f93130cec9716902c738b203c9ef6bd17aeb3f8b45a4451ff4aa5fc3ac5a9","pitch":43,"startTick":23040,"durati',
  'onTicks":7680,"velocity":100}]},{"role":"arpeggiator","notes":[{"id":"note-2810f4863395a598bdeca12c21e2cf15ad3d6abac45de31e2870c29e905dd9bd","pitch":55,"startTick":0,"durationTicks":360,"velocity":100},{"id":"note-efa6e0',
  'f1d8a8f983552aa0537c4525443c32166880679971c72eaef086fce0ee","pitch":51,"startTick":480,"durationTicks":360,"velocity":100},{"id":"note-e019f8999d37f36fc028339b42567660872303538866f193ab8ef215e05db0d1","pitch":43,"startTi',
  'ck":1440,"durationTicks":360,"velocity":100},{"id":"note-6c442032c9ee098f997a1092da8c57d82185ffb0ddcd2220b58de5a5b2c84a20","pitch":39,"startTick":1920,"durationTicks":360,"velocity":100},{"id":"note-5ec2aee21342f00ed040b',
  'bf29ae794fb5a19d1daf9a24c87bf25b195dcb7e4f5","pitch":36,"startTick":2400,"durationTicks":360,"velocity":100},{"id":"note-e61bd5e7298eff7c8d98f3539219774845247b2dea3ad47219fa8e9d33b52e0c","pitch":51,"startTick":3360,"dura',
  'tionTicks":360,"velocity":100},{"id":"note-29aaa0a08d68bcf8d83c2065bf426236fd365e953b64b2898bfcc86d03fbc75a","pitch":48,"startTick":3840,"durationTicks":360,"velocity":100},{"id":"note-500275d8c2ff3c54a723232aecaff796a90',
  '9d3fb46c9f6ff2909bb2ac084beed","pitch":43,"startTick":4320,"durationTicks":360,"velocity":100},{"id":"note-91d2428864b4bce8a8fe6aa872740d77a8a9f0edd7449b5853c23664b39c5395","pitch":36,"startTick":5280,"durationTicks":360',
  ',"velocity":100},{"id":"note-938338bf89d1fee529e42f661e949eaa81c3c6a07066b702db57ff67f783a6f8","pitch":55,"startTick":5760,"durationTicks":360,"velocity":100},{"id":"note-8327d2e5acbd5722ad56f2d54ef89aa193dcdf411cc86fd56',
  'ce0cc797f550f2e","pitch":51,"startTick":6240,"durationTicks":360,"velocity":100},{"id":"note-de9c11531d7d09bc787aab17fcdc839f0cc5347186e2891a665f1b1b67c7affa","pitch":43,"startTick":7200,"durationTicks":360,"velocity":10',
  '0},{"id":"note-f2a21f6d7f20b556f63be1e97975ebca5f239d8af87e4d9579e4a42247c47a89","pitch":58,"startTick":7680,"durationTicks":360,"velocity":100},{"id":"note-1771a6e66f896ea8c05974466b9172895059ea2a21a30bb7c2776cd2798367f',
  'f","pitch":53,"startTick":8160,"durationTicks":360,"velocity":100},{"id":"note-4eaaff66d5dedf805ac63e9016c9813b76bcf6fdc22cc5a6378b849a6a8aba90","pitch":46,"startTick":9120,"durationTicks":360,"velocity":100},{"id":"note',
  '-b3d8f0d9264ac4922107167acffc6e245f2bfdfdcc0533f9062649be1d9650f8","pitch":41,"startTick":9600,"durationTicks":360,"velocity":100},{"id":"note-fd875a4a82159a81a1ea06cc6d761a875c3bc28d26bff61f2db64039f78a7fe6","pitch":38,',
  '"startTick":10080,"durationTicks":360,"velocity":100},{"id":"note-1b1ef2cd519d80010c91e880b27b62c735239f9339a8acfc26c487a915edd427","pitch":53,"startTick":11040,"durationTicks":360,"velocity":100},{"id":"note-80c6d470e77',
  '91f0d89963a5d4a52efe9bb6eae11b1f9d90cb393706cd17b9a96","pitch":50,"startTick":11520,"durationTicks":360,"velocity":100},{"id":"note-fbb1573aed7ff60a84b5a4b40a5262a3719b34c79173213e6a766fc1ed015c2d","pitch":46,"startTick"',
  ':12000,"durationTicks":360,"velocity":100},{"id":"note-afb5cb8200e5299c9d809da01e85c740b4f64ee29cb0a27fc7b6dfa5ad31fa8a","pitch":38,"startTick":12960,"durationTicks":360,"velocity":100},{"id":"note-b510508c825786e2d56f32',
  '72e9b8d09b7f4b256940267808bdea0171d946d418","pitch":58,"startTick":13440,"durationTicks":360,"velocity":100},{"id":"note-c03a1594ef294facc8b52cdb7536e14c4f76c5c2aac8fc53701670780ecda461","pitch":53,"startTick":13920,"dur',
  'ationTicks":360,"velocity":100},{"id":"note-c77306777ebad4827dfa4591ca6e0069039fc941e701489b86c6491eaa380727","pitch":46,"startTick":14880,"durationTicks":360,"velocity":100},{"id":"note-64104d8accbd3b1458e8be10816e043dc',
  '81d87f7c2abcc46b8b75714ebeae8c9","pitch":56,"startTick":15360,"durationTicks":360,"velocity":100},{"id":"note-89abf4e66e1cbc5a93dbf468abc66935275e85d4ca35879c78c7c7223030a1cf","pitch":51,"startTick":15840,"durationTicks"',
  ':360,"velocity":100},{"id":"note-b3a646780eb83acec680d9deb4376811ca0b632d31533d107361ee698328a028","pitch":44,"startTick":16800,"durationTicks":360,"velocity":100},{"id":"note-88dc48694cff0dee4c9802d948a92079c3d5c5126c8a',
  '7b0ac3b6efbbcd3f1e48","pitch":39,"startTick":17280,"durationTicks":360,"velocity":100},{"id":"note-3b014cbb2d9ca03573a93d99738986b7c91c9cdbbd3b51434ad330e17bd89418","pitch":36,"startTick":17760,"durationTicks":360,"veloc',
  'ity":100},{"id":"note-72fcce71d7a96b1a82ba9a486ec8e9dc0723f336a6b267b9ef3bf7ffcfab3df6","pitch":51,"startTick":18720,"durationTicks":360,"velocity":100},{"id":"note-12ec5d4bc0847f4323ab0e88a30cce9c8d88da68af817113064ca0d',
  'ced403a72","pitch":48,"startTick":19200,"durationTicks":360,"velocity":100},{"id":"note-9c32f71586a43a82350e34cbc4f1b814faf984a722cb4a65b5868b2fc0bf8614","pitch":44,"startTick":19680,"durationTicks":360,"velocity":100},{',
  '"id":"note-738237ab48a83707a822f2851f5dbabe107692d8cb545cc53424aa0418e0ecd8","pitch":36,"startTick":20640,"durationTicks":360,"velocity":100},{"id":"note-d35a97b9c2f0a765b31a2e361e264cfa0fcbeabda3eff79fcdd8f1dbd1107df1",',
  '"pitch":56,"startTick":21120,"durationTicks":360,"velocity":100},{"id":"note-b31d2869f032848377c620930380ab3a7a5e31221a3a58b38b97b22d425c5445","pitch":51,"startTick":21600,"durationTicks":360,"velocity":100},{"id":"note-',
  '8338af01c8662d15e9d426d69a28b6457d4bff04a7b0a8d15a13e6e9108c2147","pitch":44,"startTick":22560,"durationTicks":360,"velocity":100},{"id":"note-bb7e1e958b9e2c07c834bec2089f652b6c113ed37358db921f0a71ca29f597eb","pitch":59,',
  '"startTick":23040,"durationTicks":360,"velocity":100},{"id":"note-ed0c3987cf95836c63f6dd46fc66dbbbacae65577854f81e7b18d3b6859bb93a","pitch":55,"startTick":23520,"durationTicks":360,"velocity":100},{"id":"note-85b05bb1e06',
  'e5e16116cbba63f88d9b917f7906e2157aa6cf777e886f5712ef6","pitch":47,"startTick":24480,"durationTicks":360,"velocity":100},{"id":"note-080c8a3f5e85746fa6cce10f8b55cf9a0126f93255dbedd0e5065c065bd5d213","pitch":43,"startTick"',
  ':24960,"durationTicks":360,"velocity":100},{"id":"note-027952211a61fac939ec10fd1405f58799b8ac49b46147319660abe18d8daec9","pitch":38,"startTick":25440,"durationTicks":360,"velocity":100},{"id":"note-185485fca6cdb8e408a486',
  '075e7511912c7a2f2a81d59a43b7e2d71f0ab83871","pitch":55,"startTick":26400,"durationTicks":360,"velocity":100},{"id":"note-3a4d0b2e7c31ba0400d7555f7410742ae91442ff27d5bccb5c854d0986914401","pitch":50,"startTick":26880,"dur',
  'ationTicks":360,"velocity":100},{"id":"note-1989b89967079b3a39636e8728a70b3c53c486d9a359f4a16eaef92ee82ede2a","pitch":47,"startTick":27360,"durationTicks":360,"velocity":100},{"id":"note-c883efd82163591875ce60473723f2d2e',
  '41c3b9db16aaeb8f7c434591bd922bb","pitch":38,"startTick":28320,"durationTicks":360,"velocity":100},{"id":"note-f432d8c6babe825410563f4c3d56533ac3c2ef2fb303e0d07741e0a86b1d2018","pitch":59,"startTick":28800,"durationTicks"',
  ':360,"velocity":100},{"id":"note-4282e06d347f07efd27d1e248a3e1766925e858b89c4aa590656d9b92b0ace2e","pitch":55,"startTick":29280,"durationTicks":360,"velocity":100},{"id":"note-9be9abb507043c7a64525a872585697521f577bf5943',
  'dcc05a2ac9edb7b0b77d","pitch":47,"startTick":30240,"durationTicks":360,"velocity":100}]},{"role":"lead","notes":[{"id":"note-853ab61d8567f96e2baeaeb213560536422465a0742b27bb4775fd65cfafad12","pitch":75,"startTick":0,"dur',
  'ationTicks":960,"velocity":100},{"id":"note-75336952f6892dec0e5639925cb4c8a53042a44f2d26d758ffc0acab48da0256","pitch":79,"startTick":1920,"durationTicks":960,"velocity":100},{"id":"note-10bf8e66b608c601832a0d7300e9dc8ddc',
  '79b3912e62ab99f3ee62a6d726070e","pitch":79,"startTick":3840,"durationTicks":960,"velocity":100},{"id":"note-b2e57d31534569a7221590b00c568858a43cebf342891ed553ac909781c32949","pitch":75,"startTick":5760,"durationTicks":96',
  '0,"velocity":100},{"id":"note-ca155676c53627d2b26dc4e658a3af7672a679ca65356a0461711d8cd0987e94","pitch":74,"startTick":7680,"durationTicks":960,"velocity":100},{"id":"note-04b0dc531d95015009321aecc6417905212cab6192e8d664',
  'e5078d91958a498b","pitch":77,"startTick":9600,"durationTicks":960,"velocity":100},{"id":"note-359a61bc8734bd8f32c4bcce88297282167c0c8c47b47809b0925173dedaa4a4","pitch":77,"startTick":11520,"durationTicks":960,"velocity":',
  '100},{"id":"note-19be83a377ef7f51540382bfe18b7d6ade71c26cd5fcf59851f260430ab627d3","pitch":74,"startTick":13440,"durationTicks":960,"velocity":100},{"id":"note-cf7e3f10e02a3b897e59cc903c0775024fbc5b1bc8f7c277623fc32a18ac',
  '1aae","pitch":80,"startTick":15360,"durationTicks":960,"velocity":100},{"id":"note-796ddbb17be634cd4ee244f6460c18b30ff5102b19541c1e634ca380083e0302","pitch":84,"startTick":17280,"durationTicks":960,"velocity":100},{"id":',
  '"note-56673b22e001b6258321c78841000120c2172858843b4007109acbdfa2791475","pitch":84,"startTick":19200,"durationTicks":960,"velocity":100},{"id":"note-aa75e6b6a98279d2f5006efce209001f5de3a00bed54541f5d96f269fea034e5","pitc',
  'h":80,"startTick":21120,"durationTicks":960,"velocity":100},{"id":"note-79a5988c212a6bd7cabec30727697e08edc69b20a2ba71bfef23497d95b0db57","pitch":79,"startTick":23040,"durationTicks":960,"velocity":100},{"id":"note-172c9',
  '3319bc926592b100ad7b2979e7c207a7e74d5d8aa84ddde161d9d1b5d91","pitch":79,"startTick":24960,"durationTicks":960,"velocity":100},{"id":"note-231e345a44e8e3c5d3b20be7cb7c889ea137f390da13802ac93a8f6d34bca3c4","pitch":79,"star',
  'tTick":26880,"durationTicks":960,"velocity":100},{"id":"note-d6ef221c507b37078303382a750bed292271d7096bdb642a6c518f2a888d7dad","pitch":74,"startTick":28800,"durationTicks":960,"velocity":100}]}],"parent":null,"command":n',
  'ull,"revisionHash":"f4a0d793b5e20f99df0ddb3ee028cd7b3d2592613a358f7052387d7fe009f404"}',
].join("");
const EXPECTED_DELETE_CHILD_JSON = [
  '{"schema":"nightdrive.editor-revision.v1","source":{"schema":"nightdrive.complete-section-result.v1","resultHash":"0eb122a36f7c90e6b58c4d3017d21a051a81ed54bee1b98d00a40e3adcc66fa1"},"section":{"ppq":960,"barCount":8,"tim',
  'eSignature":{"numerator":4,"denominator":4},"tempo":{"microsecondsPerQuarter":500000},"endTick":30720},"tracks":[{"role":"harmony","notes":[{"id":"note-ac1c9eb06bed77f88dec61692b3af0c81bda84ad492782a7f2c020857901bdcd","p',
  'itch":36,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-95f0adb50ce99cce670392eef99aa823b163a70b4c8a588f4f70b2b3a403a4f9","pitch":39,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-16f99431',
  'd5cc757bd0d0a0e13568a7f17b1d51e9f027998e04ca61663654f273","pitch":43,"startTick":0,"durationTicks":7680,"velocity":100},{"id":"note-68f7f26ed057ebfb9c8ecdb3de293fce0d417a55e7f3da02ee23406902401d9e","pitch":38,"startTick"',
  ':7680,"durationTicks":7680,"velocity":100},{"id":"note-88e878d68ae66e19ca0809692e4ecf15c4250d04d64a51a415df45622a75fe65","pitch":41,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-b2bbe7a5ca268e9983c80e',
  '6b0842de3900d792a9cfad3a26647f93d5e1e0ef57","pitch":46,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-59e895d00d90fdb39e6da3f1b14ffce7c04b1289475ddd5167bd1c57480e7029","pitch":36,"startTick":15360,"dur',
  'ationTicks":7680,"velocity":100},{"id":"note-bc38b0d452a8056301103f0c2df5d9fa888f9d5bacc3b347cdc5e76f6c6a9443","pitch":39,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-77a66c1573544ae87d81718986dc176',
  '84c34fa26638f05f73b368f5889105281","pitch":44,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-1dee2ea1dc8f7f8eb74e121a53d9884097dfb5046d1c6b88619f8f7225d87e66","pitch":38,"startTick":23040,"durationTic',
  'ks":7680,"velocity":100},{"id":"note-6abba983e4d542bc61950e6e88a4cfee3161144ebe5fa668810e23d57783a544","pitch":43,"startTick":23040,"durationTicks":7680,"velocity":100},{"id":"note-230619546a23728894e7c339b5206a942529ae9',
  'a241bfe8a51e88bd4c010a18c","pitch":47,"startTick":23040,"durationTicks":7680,"velocity":100}]},{"role":"bass","notes":[{"id":"note-ccb88aeb3025001af53f2bf73a50e3a68f4c6e1f94d675d46385464d8a45814f","pitch":48,"startTick":',
  '0,"durationTicks":7680,"velocity":100},{"id":"note-9f4b62fac9836ee0b5e4fcc6585e294173afde0322f3b0ea03b8cabd79ceae45","pitch":46,"startTick":7680,"durationTicks":7680,"velocity":100},{"id":"note-a84f91e4cf6b2f566e6ffdcc99',
  '68b0de74740a9552d258b5d14e8a4e415d935c","pitch":44,"startTick":15360,"durationTicks":7680,"velocity":100},{"id":"note-d27f93130cec9716902c738b203c9ef6bd17aeb3f8b45a4451ff4aa5fc3ac5a9","pitch":43,"startTick":23040,"durati',
  'onTicks":7680,"velocity":100}]},{"role":"arpeggiator","notes":[{"id":"note-2810f4863395a598bdeca12c21e2cf15ad3d6abac45de31e2870c29e905dd9bd","pitch":55,"startTick":0,"durationTicks":360,"velocity":100},{"id":"note-efa6e0',
  'f1d8a8f983552aa0537c4525443c32166880679971c72eaef086fce0ee","pitch":51,"startTick":480,"durationTicks":360,"velocity":100},{"id":"note-e019f8999d37f36fc028339b42567660872303538866f193ab8ef215e05db0d1","pitch":43,"startTi',
  'ck":1440,"durationTicks":360,"velocity":100},{"id":"note-6c442032c9ee098f997a1092da8c57d82185ffb0ddcd2220b58de5a5b2c84a20","pitch":39,"startTick":1920,"durationTicks":360,"velocity":100},{"id":"note-5ec2aee21342f00ed040b',
  'bf29ae794fb5a19d1daf9a24c87bf25b195dcb7e4f5","pitch":36,"startTick":2400,"durationTicks":360,"velocity":100},{"id":"note-e61bd5e7298eff7c8d98f3539219774845247b2dea3ad47219fa8e9d33b52e0c","pitch":51,"startTick":3360,"dura',
  'tionTicks":360,"velocity":100},{"id":"note-29aaa0a08d68bcf8d83c2065bf426236fd365e953b64b2898bfcc86d03fbc75a","pitch":48,"startTick":3840,"durationTicks":360,"velocity":100},{"id":"note-500275d8c2ff3c54a723232aecaff796a90',
  '9d3fb46c9f6ff2909bb2ac084beed","pitch":43,"startTick":4320,"durationTicks":360,"velocity":100},{"id":"note-91d2428864b4bce8a8fe6aa872740d77a8a9f0edd7449b5853c23664b39c5395","pitch":36,"startTick":5280,"durationTicks":360',
  ',"velocity":100},{"id":"note-938338bf89d1fee529e42f661e949eaa81c3c6a07066b702db57ff67f783a6f8","pitch":55,"startTick":5760,"durationTicks":360,"velocity":100},{"id":"note-8327d2e5acbd5722ad56f2d54ef89aa193dcdf411cc86fd56',
  'ce0cc797f550f2e","pitch":51,"startTick":6240,"durationTicks":360,"velocity":100},{"id":"note-de9c11531d7d09bc787aab17fcdc839f0cc5347186e2891a665f1b1b67c7affa","pitch":43,"startTick":7200,"durationTicks":360,"velocity":10',
  '0},{"id":"note-f2a21f6d7f20b556f63be1e97975ebca5f239d8af87e4d9579e4a42247c47a89","pitch":58,"startTick":7680,"durationTicks":360,"velocity":100},{"id":"note-1771a6e66f896ea8c05974466b9172895059ea2a21a30bb7c2776cd2798367f',
  'f","pitch":53,"startTick":8160,"durationTicks":360,"velocity":100},{"id":"note-4eaaff66d5dedf805ac63e9016c9813b76bcf6fdc22cc5a6378b849a6a8aba90","pitch":46,"startTick":9120,"durationTicks":360,"velocity":100},{"id":"note',
  '-b3d8f0d9264ac4922107167acffc6e245f2bfdfdcc0533f9062649be1d9650f8","pitch":41,"startTick":9600,"durationTicks":360,"velocity":100},{"id":"note-fd875a4a82159a81a1ea06cc6d761a875c3bc28d26bff61f2db64039f78a7fe6","pitch":38,',
  '"startTick":10080,"durationTicks":360,"velocity":100},{"id":"note-1b1ef2cd519d80010c91e880b27b62c735239f9339a8acfc26c487a915edd427","pitch":53,"startTick":11040,"durationTicks":360,"velocity":100},{"id":"note-80c6d470e77',
  '91f0d89963a5d4a52efe9bb6eae11b1f9d90cb393706cd17b9a96","pitch":50,"startTick":11520,"durationTicks":360,"velocity":100},{"id":"note-fbb1573aed7ff60a84b5a4b40a5262a3719b34c79173213e6a766fc1ed015c2d","pitch":46,"startTick"',
  ':12000,"durationTicks":360,"velocity":100},{"id":"note-afb5cb8200e5299c9d809da01e85c740b4f64ee29cb0a27fc7b6dfa5ad31fa8a","pitch":38,"startTick":12960,"durationTicks":360,"velocity":100},{"id":"note-b510508c825786e2d56f32',
  '72e9b8d09b7f4b256940267808bdea0171d946d418","pitch":58,"startTick":13440,"durationTicks":360,"velocity":100},{"id":"note-c03a1594ef294facc8b52cdb7536e14c4f76c5c2aac8fc53701670780ecda461","pitch":53,"startTick":13920,"dur',
  'ationTicks":360,"velocity":100},{"id":"note-c77306777ebad4827dfa4591ca6e0069039fc941e701489b86c6491eaa380727","pitch":46,"startTick":14880,"durationTicks":360,"velocity":100},{"id":"note-64104d8accbd3b1458e8be10816e043dc',
  '81d87f7c2abcc46b8b75714ebeae8c9","pitch":56,"startTick":15360,"durationTicks":360,"velocity":100},{"id":"note-89abf4e66e1cbc5a93dbf468abc66935275e85d4ca35879c78c7c7223030a1cf","pitch":51,"startTick":15840,"durationTicks"',
  ':360,"velocity":100},{"id":"note-b3a646780eb83acec680d9deb4376811ca0b632d31533d107361ee698328a028","pitch":44,"startTick":16800,"durationTicks":360,"velocity":100},{"id":"note-88dc48694cff0dee4c9802d948a92079c3d5c5126c8a',
  '7b0ac3b6efbbcd3f1e48","pitch":39,"startTick":17280,"durationTicks":360,"velocity":100},{"id":"note-3b014cbb2d9ca03573a93d99738986b7c91c9cdbbd3b51434ad330e17bd89418","pitch":36,"startTick":17760,"durationTicks":360,"veloc',
  'ity":100},{"id":"note-72fcce71d7a96b1a82ba9a486ec8e9dc0723f336a6b267b9ef3bf7ffcfab3df6","pitch":51,"startTick":18720,"durationTicks":360,"velocity":100},{"id":"note-12ec5d4bc0847f4323ab0e88a30cce9c8d88da68af817113064ca0d',
  'ced403a72","pitch":48,"startTick":19200,"durationTicks":360,"velocity":100},{"id":"note-9c32f71586a43a82350e34cbc4f1b814faf984a722cb4a65b5868b2fc0bf8614","pitch":44,"startTick":19680,"durationTicks":360,"velocity":100},{',
  '"id":"note-738237ab48a83707a822f2851f5dbabe107692d8cb545cc53424aa0418e0ecd8","pitch":36,"startTick":20640,"durationTicks":360,"velocity":100},{"id":"note-d35a97b9c2f0a765b31a2e361e264cfa0fcbeabda3eff79fcdd8f1dbd1107df1",',
  '"pitch":56,"startTick":21120,"durationTicks":360,"velocity":100},{"id":"note-b31d2869f032848377c620930380ab3a7a5e31221a3a58b38b97b22d425c5445","pitch":51,"startTick":21600,"durationTicks":360,"velocity":100},{"id":"note-',
  '8338af01c8662d15e9d426d69a28b6457d4bff04a7b0a8d15a13e6e9108c2147","pitch":44,"startTick":22560,"durationTicks":360,"velocity":100},{"id":"note-bb7e1e958b9e2c07c834bec2089f652b6c113ed37358db921f0a71ca29f597eb","pitch":59,',
  '"startTick":23040,"durationTicks":360,"velocity":100},{"id":"note-ed0c3987cf95836c63f6dd46fc66dbbbacae65577854f81e7b18d3b6859bb93a","pitch":55,"startTick":23520,"durationTicks":360,"velocity":100},{"id":"note-85b05bb1e06',
  'e5e16116cbba63f88d9b917f7906e2157aa6cf777e886f5712ef6","pitch":47,"startTick":24480,"durationTicks":360,"velocity":100},{"id":"note-080c8a3f5e85746fa6cce10f8b55cf9a0126f93255dbedd0e5065c065bd5d213","pitch":43,"startTick"',
  ':24960,"durationTicks":360,"velocity":100},{"id":"note-027952211a61fac939ec10fd1405f58799b8ac49b46147319660abe18d8daec9","pitch":38,"startTick":25440,"durationTicks":360,"velocity":100},{"id":"note-185485fca6cdb8e408a486',
  '075e7511912c7a2f2a81d59a43b7e2d71f0ab83871","pitch":55,"startTick":26400,"durationTicks":360,"velocity":100},{"id":"note-3a4d0b2e7c31ba0400d7555f7410742ae91442ff27d5bccb5c854d0986914401","pitch":50,"startTick":26880,"dur',
  'ationTicks":360,"velocity":100},{"id":"note-1989b89967079b3a39636e8728a70b3c53c486d9a359f4a16eaef92ee82ede2a","pitch":47,"startTick":27360,"durationTicks":360,"velocity":100},{"id":"note-c883efd82163591875ce60473723f2d2e',
  '41c3b9db16aaeb8f7c434591bd922bb","pitch":38,"startTick":28320,"durationTicks":360,"velocity":100},{"id":"note-f432d8c6babe825410563f4c3d56533ac3c2ef2fb303e0d07741e0a86b1d2018","pitch":59,"startTick":28800,"durationTicks"',
  ':360,"velocity":100},{"id":"note-4282e06d347f07efd27d1e248a3e1766925e858b89c4aa590656d9b92b0ace2e","pitch":55,"startTick":29280,"durationTicks":360,"velocity":100},{"id":"note-9be9abb507043c7a64525a872585697521f577bf5943',
  'dcc05a2ac9edb7b0b77d","pitch":47,"startTick":30240,"durationTicks":360,"velocity":100}]},{"role":"lead","notes":[{"id":"note-853ab61d8567f96e2baeaeb213560536422465a0742b27bb4775fd65cfafad12","pitch":75,"startTick":0,"dur',
  'ationTicks":960,"velocity":100},{"id":"note-75336952f6892dec0e5639925cb4c8a53042a44f2d26d758ffc0acab48da0256","pitch":79,"startTick":1920,"durationTicks":960,"velocity":100},{"id":"note-10bf8e66b608c601832a0d7300e9dc8ddc',
  '79b3912e62ab99f3ee62a6d726070e","pitch":79,"startTick":3840,"durationTicks":960,"velocity":100},{"id":"note-b2e57d31534569a7221590b00c568858a43cebf342891ed553ac909781c32949","pitch":75,"startTick":5760,"durationTicks":96',
  '0,"velocity":100},{"id":"note-ca155676c53627d2b26dc4e658a3af7672a679ca65356a0461711d8cd0987e94","pitch":74,"startTick":7680,"durationTicks":960,"velocity":100},{"id":"note-04b0dc531d95015009321aecc6417905212cab6192e8d664',
  'e5078d91958a498b","pitch":77,"startTick":9600,"durationTicks":960,"velocity":100},{"id":"note-359a61bc8734bd8f32c4bcce88297282167c0c8c47b47809b0925173dedaa4a4","pitch":77,"startTick":11520,"durationTicks":960,"velocity":',
  '100},{"id":"note-cf7e3f10e02a3b897e59cc903c0775024fbc5b1bc8f7c277623fc32a18ac1aae","pitch":80,"startTick":15360,"durationTicks":960,"velocity":100},{"id":"note-796ddbb17be634cd4ee244f6460c18b30ff5102b19541c1e634ca380083e',
  '0302","pitch":84,"startTick":17280,"durationTicks":960,"velocity":100},{"id":"note-56673b22e001b6258321c78841000120c2172858843b4007109acbdfa2791475","pitch":84,"startTick":19200,"durationTicks":960,"velocity":100},{"id":',
  '"note-aa75e6b6a98279d2f5006efce209001f5de3a00bed54541f5d96f269fea034e5","pitch":80,"startTick":21120,"durationTicks":960,"velocity":100},{"id":"note-79a5988c212a6bd7cabec30727697e08edc69b20a2ba71bfef23497d95b0db57","pitc',
  'h":79,"startTick":23040,"durationTicks":960,"velocity":100},{"id":"note-172c93319bc926592b100ad7b2979e7c207a7e74d5d8aa84ddde161d9d1b5d91","pitch":79,"startTick":24960,"durationTicks":960,"velocity":100},{"id":"note-231e3',
  '45a44e8e3c5d3b20be7cb7c889ea137f390da13802ac93a8f6d34bca3c4","pitch":79,"startTick":26880,"durationTicks":960,"velocity":100},{"id":"note-d6ef221c507b37078303382a750bed292271d7096bdb642a6c518f2a888d7dad","pitch":74,"star',
  'tTick":28800,"durationTicks":960,"velocity":100}]}],"parent":{"schema":"nightdrive.editor-revision.v1","revisionHash":"f4a0d793b5e20f99df0ddb3ee028cd7b3d2592613a358f7052387d7fe009f404"},"command":{"schema":"nightdrive.ed',
  'itor-note-command.v4","type":"delete-note","noteId":"note-19be83a377ef7f51540382bfe18b7d6ade71c26cd5fcf59851f260430ab627d3"},"revisionHash":"e34fb29d0fded6510c7bfdd89e5f20a64b966d954b8fd7cf923ef3d683624158"}',
].join("");
describe("M2 editor revisions", () => {
  it("matches literal canonical root/child bytes against independent tracks and test-side SHA-256", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    const independentRoot = independentRootRevision();
    const independentChild = independentStartTickChild(independentRoot);
    const target = independentRoot.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing independent Lead fixture.");
    const child = createChildEditorRevisionV1(
      root,
      {
        schema: "nightdrive.editor-note-command.v2",
        type: "set-note-start-tick",
        noteId: target.id,
        expectedStartTick: 0,
        startTick: 480,
      },
      source,
      [],
    );
    const actualRootJson = serializeEditorRevisionV1(root, source, []);
    const actualChildJson = serializeEditorRevisionV1(child, source, [root]);
    const independentRootJson = JSON.stringify(independentRoot);
    const independentChildJson = JSON.stringify(independentChild);
    expect(source.resultHash).toBe(EXPECTED_START_TICK_SOURCE_HASH);
    expect(sha256Utf8(EXPECTED_FIRST_LEAD_NOTE_ID_INPUT)).toBe(
      EXPECTED_FIRST_LEAD_NOTE_ID.slice("note-".length),
    );
    expect(target.id).toBe(EXPECTED_FIRST_LEAD_NOTE_ID);
    expect(independentRoot.revisionHash).toBe(EXPECTED_START_TICK_ROOT_HASH);
    expect(independentChild.revisionHash).toBe(EXPECTED_START_TICK_CHILD_HASH);
    expect(independentRootJson).toBe(EXPECTED_START_TICK_ROOT_JSON);
    expect(independentChildJson).toBe(EXPECTED_START_TICK_CHILD_JSON);
    expect(actualRootJson).toBe(independentRootJson);
    expect(Buffer.from(actualRootJson, "utf8")).toEqual(
      Buffer.from(EXPECTED_START_TICK_ROOT_JSON, "utf8"),
    );
    expect(actualChildJson).toBe(independentChildJson);
    expect(Buffer.from(actualChildJson, "utf8")).toEqual(
      Buffer.from(EXPECTED_START_TICK_CHILD_JSON, "utf8"),
    );
    expect(sha256Utf8(independentRevisionHashInput(EXPECTED_START_TICK_ROOT_JSON))).toBe(
      EXPECTED_START_TICK_ROOT_HASH,
    );
    expect(root.revisionHash).toBe(EXPECTED_START_TICK_ROOT_HASH);
    expect(sha256Utf8(independentRevisionHashInput(EXPECTED_START_TICK_CHILD_JSON))).toBe(
      EXPECTED_START_TICK_CHILD_HASH,
    );
    expect(child.revisionHash).toBe(EXPECTED_START_TICK_CHILD_HASH);
    expect(verifyEditorRevisionV1(child, source, [root])).toEqual(child);
  });

  it("matches the independent v3 duration command, canonical child bytes, and standard SHA-256", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    const independentRoot = independentRootRevision();
    const expectedChild = independentDurationChild(independentRoot);
    const target = independentRoot.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing independent Lead fixture.");
    const command = {
      schema: "nightdrive.editor-note-command.v3",
      type: "set-note-duration",
      noteId: target.id,
      expectedDurationTicks: target.durationTicks,
      durationTicks: 1440,
    } as const;
    const child = createChildEditorRevisionV1(root, command, source, []);
    const expectedChildJson = JSON.stringify(expectedChild);
    const actualChildJson = serializeEditorRevisionV1(child, source, [root]);
    const hashInput = independentRevisionHashInput(expectedChildJson);

    expect(JSON.stringify(command)).toBe(EXPECTED_DURATION_COMMAND_JSON);
    expect(source.resultHash).toBe(EXPECTED_START_TICK_SOURCE_HASH);
    expect(expectedChild.revisionHash).toBe(EXPECTED_DURATION_CHILD_HASH);
    expect(sha256Utf8(hashInput)).toBe(EXPECTED_DURATION_CHILD_HASH);
    expect(child.revisionHash).toBe(EXPECTED_DURATION_CHILD_HASH);
    expect(actualChildJson).toBe(expectedChildJson);
    expect(Buffer.from(actualChildJson, "utf8")).toEqual(Buffer.from(expectedChildJson, "utf8"));
    expect(child).toEqual(expectedChild);
    expect(child.parent?.revisionHash).toBe(root.revisionHash);
    expect(child.tracks.map((track) => track.role)).toEqual(root.tracks.map((track) => track.role));
    expect(child.tracks[3]?.notes.map((note) => note.id)).toEqual(
      root.tracks[3]?.notes.map((note) => note.id),
    );
    for (const [trackIndex, track] of root.tracks.entries()) {
      for (const [noteIndex, note] of track.notes.entries()) {
        const actual = child.tracks[trackIndex]?.notes[noteIndex];
        expect(actual).toEqual(
          track.role === "lead" && noteIndex === 0 ? { ...note, durationTicks: 1440 } : note,
        );
      }
    }
    expect(verifyEditorRevisionV1(child, source, [root])).toEqual(child);
    const replay = createChildEditorRevisionV1(root, command, source, []);
    expect(JSON.stringify(replay)).toBe(actualChildJson);
    expect(replay.revisionHash).toBe(child.revisionHash);
    expect(Object.isFrozen(child)).toBe(true);
    expect(Object.isFrozen(child.tracks[3]?.notes[0])).toBe(true);
  });
  it("imports a frozen four-role root with deterministic IDs and velocity 100", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    expect(root.tracks.map((track) => track.role)).toEqual([
      "harmony",
      "bass",
      "arpeggiator",
      "lead",
    ]);
    expect(root.tracks.flatMap((track) => track.notes).every((note) => note.velocity === 100)).toBe(
      true,
    );
    expect(Object.isFrozen(root.tracks[3]?.notes[0])).toBe(true);
    expect(importCompleteSectionAsEditorRootV1(source)).toEqual(root);
    expect(serializeEditorRevisionV1(root, source, [])).toBe(JSON.stringify(root));
  });

  it("applies one Lead pitch command and preserves source, IDs, timing and other roles", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    const next = applyEditorCommandV1(
      current,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 76,
      },
    );
    const child = selectedEditorRevisionV1(next);
    expect(child.source).toEqual(root.source);
    expect(child.parent?.revisionHash).toBe(root.revisionHash);
    expect(child.tracks[3]?.notes[0]).toMatchObject({
      id: target.id,
      pitch: 76,
      startTick: target.startTick,
      durationTicks: target.durationTicks,
      velocity: 100,
    });
    expect(child.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));
  });

  it("navigates exact immutable entries and clears redo only after a valid new edit", async () => {
    const initial = await history();
    const root = selectedEditorRevisionV1(initial);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    const edited = applyEditorCommandV1(
      initial,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 76,
      },
    );
    const child = selectedEditorRevisionV1(edited);
    const undone = undoEditorHistoryV1(edited);
    if (!undone) throw new Error("Undo should be available after an edit.");
    expect(selectedEditorRevisionV1(undone)).toEqual(root);
    const redone = redoEditorHistoryV1(undone);
    if (!redone) throw new Error("Redo should be available after undo.");
    expect(selectedEditorRevisionV1(redone)).toEqual(child);
    const replacement = applyEditorCommandV1(
      undone,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 77,
      },
    );
    expect(redoEditorHistoryV1(replacement)).toBeNull();
    expect(replacement.revisions).toHaveLength(2);
  });

  it("rejects stale or out-of-range commands without changing history", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    expect(() =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: "0".repeat(64) },
        {
          schema: EDITOR_COMMAND_SCHEMA_V1,
          type: "set-note-pitch",
          noteId: target.id,
          expectedPitch: target.pitch,
          pitch: 76,
        },
      ),
    ).toThrow(
      expect.objectContaining({ code: "STALE_EDITOR_PARENT" } satisfies Partial<EditorValueError>),
    );
    expect(() =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: root.revisionHash },
        {
          schema: EDITOR_COMMAND_SCHEMA_V1,
          type: "set-note-pitch",
          noteId: target.id,
          expectedPitch: target.pitch,
          pitch: 85,
        },
      ),
    ).toThrow(
      expect.objectContaining({
        code: "EDITOR_LEAD_PITCH_OUT_OF_RANGE",
      } satisfies Partial<EditorValueError>),
    );
    expect(current.revisions).toHaveLength(1);
  });
  it("changes only the absolute Lead start tick and accepts inclusive neighbors, overlap, and the section end", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const lead = root.tracks[3]?.notes;
    if (!lead || lead.length < 3) throw new Error("Missing ordered Lead fixture.");
    const target = lead[1];
    const previous = lead[0];
    const next = lead[2];
    const last = lead.at(-1);
    if (!target || !previous || !next || !last) throw new Error("Incomplete Lead fixture.");

    const sameAsPrevious = applyEditorCommandV1(
      current,
      { schema: root.schema, revisionHash: root.revisionHash },
      startTickCommand(root, 1, previous.startTick),
    );
    const previousBoundary = selectedEditorRevisionV1(sameAsPrevious);
    expect(previousBoundary.tracks[3]?.notes.map((note) => note.id)).toEqual(
      lead.map((note) => note.id),
    );
    expect(previousBoundary.tracks[3]?.notes[1]).toEqual({
      ...target,
      startTick: previous.startTick,
    });
    expect(previousBoundary.tracks[3]?.notes[1]?.startTick).toBe(previous.startTick);
    expect(
      (previousBoundary.tracks[3]?.notes[1]?.startTick ?? 0) +
        (previousBoundary.tracks[3]?.notes[1]?.durationTicks ?? 0),
    ).toBeGreaterThan(previous.startTick);
    expect(previousBoundary.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));

    const sameAsNext = applyEditorCommandV1(
      current,
      { schema: root.schema, revisionHash: root.revisionHash },
      startTickCommand(root, 1, next.startTick),
    );
    expect(selectedEditorRevisionV1(sameAsNext).tracks[3]?.notes[1]?.startTick).toBe(
      next.startTick,
    );

    const endAlignedStart = 30720 - last.durationTicks;
    const endingAtSectionBoundary = applyEditorCommandV1(
      current,
      { schema: root.schema, revisionHash: root.revisionHash },
      startTickCommand(root, lead.length - 1, endAlignedStart),
    );
    const lastAfterMove = selectedEditorRevisionV1(endingAtSectionBoundary).tracks[3]?.notes.at(-1);
    if (!lastAfterMove) throw new Error("Missing moved final Lead note.");
    expect(lastAfterMove.startTick).toBe(endAlignedStart);
    expect(lastAfterMove.startTick + lastAfterMove.durationTicks).toBe(30720);
  });

  it("changes only one absolute Lead duration and permits overlap through the exact section boundary", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const lead = root.tracks[3]?.notes;
    const target = lead?.[0];
    if (!lead || !target || lead.length < 2) throw new Error("Missing ordered Lead fixture.");
    const apply = (durationTicks: number) =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: root.revisionHash },
        durationCommand(root, 0, durationTicks),
      );

    const overlaps = apply(2400);
    const overlappingRevision = selectedEditorRevisionV1(overlaps);
    expect(overlappingRevision.command).toEqual({
      schema: "nightdrive.editor-note-command.v3",
      type: "set-note-duration",
      noteId: target.id,
      expectedDurationTicks: target.durationTicks,
      durationTicks: 2400,
    });
    expect(overlappingRevision.tracks[3]?.notes[0]).toEqual({ ...target, durationTicks: 2400 });
    expect(overlappingRevision.tracks[3]?.notes.map((note) => note.id)).toEqual(
      lead.map((note) => note.id),
    );
    expect(overlappingRevision.tracks[3]?.notes.map((note) => note.startTick)).toEqual(
      lead.map((note) => note.startTick),
    );
    expect(overlappingRevision.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));
    expect(overlappingRevision.tracks[3]?.notes[0]?.startTick).toBe(0);
    const firstOverlappingNote = overlappingRevision.tracks[3]?.notes[0];
    expect((firstOverlappingNote?.startTick ?? 0) + 2400).toBeGreaterThan(lead[1]?.startTick ?? 0);

    const endingAtSectionBoundary = apply(30720);
    const last = endingAtSectionBoundary.revisions[1]?.tracks[3]?.notes[0];
    if (!last) throw new Error("Missing boundary duration revision.");
    expect(last.durationTicks).toBe(30720);
    expect(last.startTick + last.durationTicks).toBe(30720);
    expect(Object.isFrozen(last)).toBe(true);
    expect(current.cursor).toBe(0);
    expect(current.revisions).toEqual([root]);
  });

  it("rejects stale, no-op, malformed, and out-of-section duration commands without changing history", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const lead = root.tracks[3]?.notes;
    const target = lead?.[0];
    const bass = root.tracks[1]?.notes[0];
    if (!target || !bass) throw new Error("Missing editor fixtures.");
    const apply = (command: unknown) =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: root.revisionHash },
        command as never,
      );
    const valid = durationCommand(root, 0, 1440);

    expect(() => apply(durationCommand(root, 0, target.durationTicks))).toThrow(
      expect.objectContaining({ code: "NO_OP_EDITOR_COMMAND", field: "command.durationTicks" }),
    );
    expect(() => apply({ ...valid, expectedDurationTicks: target.durationTicks - 1 })).toThrow(
      expect.objectContaining({
        code: "STALE_EDITOR_NOTE_VALUE",
        field: "command.expectedDurationTicks",
      }),
    );
    expect(() =>
      apply({
        ...valid,
        expectedDurationTicks: target.durationTicks - 1,
        durationTicks: 30721,
      }),
    ).toThrow(expect.objectContaining({ code: "STALE_EDITOR_NOTE_VALUE" }));
    for (const durationTicks of [0, -1, 30721])
      expect(() => apply(durationCommand(root, 0, durationTicks))).toThrow(
        expect.objectContaining({
          code: "EDITOR_NOTE_DURATION_OUT_OF_RANGE",
          field: "command.durationTicks",
        }),
      );
    for (const durationTicks of [1.5, Number.MAX_SAFE_INTEGER + 1, "960"])
      expect(() => apply({ ...valid, durationTicks })).toThrow(
        expect.objectContaining({
          code: "INVALID_EDITOR_COMMAND",
          field: "command.durationTicks",
        }),
      );
    expect(() => apply({ ...valid, expectedDurationTicks: 0 })).toThrow(
      expect.objectContaining({
        code: "INVALID_EDITOR_COMMAND",
        field: "command.expectedDurationTicks",
      }),
    );
    expect(() => apply({ ...valid, noteId: bass.id })).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_NOT_EDITABLE", field: "command.noteId" }),
    );
    expect(() =>
      apply({
        ...valid,
        noteId: "note-0000000000000000000000000000000000000000000000000000000000000000",
      }),
    ).toThrow(expect.objectContaining({ code: "EDITOR_NOTE_NOT_FOUND", field: "command.noteId" }));
    let getterRan = false;
    const accessor = { ...valid };
    Object.defineProperty(accessor, "durationTicks", {
      enumerable: true,
      get() {
        getterRan = true;
        return 1440;
      },
    });
    expect(() => apply(accessor)).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
    );
    expect(getterRan).toBe(false);
    const withFunction = { ...valid, extension: () => (getterRan = true) };
    const withToJSON = { ...valid, toJSON: () => (getterRan = true) };
    const withSymbol = { ...valid, [Symbol("extra")]: true };
    const wrongOrder = {
      type: valid.type,
      schema: valid.schema,
      noteId: valid.noteId,
      expectedDurationTicks: valid.expectedDurationTicks,
      durationTicks: valid.durationTicks,
    };
    for (const malformed of [withFunction, withToJSON, withSymbol, wrongOrder])
      expect(() => apply(malformed)).toThrow(
        expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
      );
    expect(getterRan).toBe(false);
    expect(() => apply({ ...valid, extra: true })).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
    );
    expect(() => apply({ ...valid, type: "set-note-pitch" })).toThrow(
      expect.objectContaining({ code: "UNSUPPORTED_EDITOR_COMMAND_TYPE" }),
    );
    expect(current.cursor).toBe(0);
    expect(current.revisions).toEqual([root]);
  });

  it("truncates redo only after a valid duration edit from an undone revision", async () => {
    const initial = await history();
    const root = selectedEditorRevisionV1(initial);
    const edited = applyEditorCommandV1(
      initial,
      { schema: root.schema, revisionHash: root.revisionHash },
      durationCommand(root, 1, 1200),
    );
    const undone = undoEditorHistoryV1(edited);
    if (!undone) throw new Error("Undo should restore the root revision.");
    expect(redoEditorHistoryV1(undone)).toEqual(edited);
    const undoneRoot = selectedEditorRevisionV1(undone);
    expect(() =>
      applyEditorCommandV1(
        undone,
        { schema: undoneRoot.schema, revisionHash: undoneRoot.revisionHash },
        durationCommand(undoneRoot, 1, 960),
      ),
    ).toThrow(expect.objectContaining({ code: "NO_OP_EDITOR_COMMAND" }));
    expect(redoEditorHistoryV1(undone)).toEqual(edited);
    const branched = applyEditorCommandV1(
      undone,
      { schema: undoneRoot.schema, revisionHash: undoneRoot.revisionHash },
      durationCommand(undoneRoot, 1, 1440),
    );
    expect(redoEditorHistoryV1(branched)).toBeNull();
    expect(branched.revisions).toHaveLength(2);
    expect(selectedEditorRevisionV1(edited).tracks[3]?.notes[1]?.durationTicks).toBe(1200);
    expect(selectedEditorRevisionV1(branched).tracks[3]?.notes[1]?.durationTicks).toBe(1440);
  });

  it("rejects stale, no-op, out-of-section, and out-of-order start ticks without changing history", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const lead = root.tracks[3]?.notes;
    if (!lead || lead.length < 4) throw new Error("Missing ordered Lead fixture.");
    const apply = (command: ReturnType<typeof startTickCommand>) =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: root.revisionHash },
        command,
      );

    expect(() => apply(startTickCommand(root, 1, lead[1]?.startTick ?? 0))).toThrow(
      expect.objectContaining({ code: "NO_OP_EDITOR_COMMAND" }),
    );
    const stale = startTickCommand(root, 1, 480);
    expect(() => apply({ ...stale, expectedStartTick: stale.expectedStartTick - 1 })).toThrow(
      expect.objectContaining({ code: "STALE_EDITOR_NOTE_VALUE" }),
    );
    expect(() =>
      apply({ ...stale, expectedStartTick: stale.expectedStartTick - 1, startTick: 30720 }),
    ).toThrow(expect.objectContaining({ code: "STALE_EDITOR_NOTE_VALUE" }));
    expect(() => apply(startTickCommand(root, 1, -1))).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_START_OUT_OF_RANGE" }),
    );
    expect(() => apply(startTickCommand(root, 1, 30720))).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_START_OUT_OF_RANGE" }),
    );
    expect(() => apply(startTickCommand(root, lead.length - 1, 29761))).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_START_OUT_OF_RANGE" }),
    );
    expect(() => apply(startTickCommand(root, 2, (lead[1]?.startTick ?? 0) - 1))).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_START_ORDER_INVALID" }),
    );
    expect(() => apply(startTickCommand(root, 1, (lead[2]?.startTick ?? 0) + 1))).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_START_ORDER_INVALID" }),
    );
    expect(() => apply({ ...startTickCommand(root, 1, 480), startTick: 1.5 })).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
    );
    expect(current.cursor).toBe(0);
    const bass = root.tracks[1]?.notes[0];
    if (!bass) throw new Error("Missing Bass note fixture.");
    expect(() => apply({ ...startTickCommand(root, 1, 480), noteId: bass.id })).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_NOT_EDITABLE" }),
    );
    expect(() =>
      apply({
        ...startTickCommand(root, 1, 480),
        noteId: "note-0000000000000000000000000000000000000000000000000000000000000000",
      }),
    ).toThrow(expect.objectContaining({ code: "EDITOR_NOTE_NOT_FOUND" }));
    expect(current.revisions).toHaveLength(1);
    expect(current.revisions[0]).toEqual(root);
  });

  it("retains redo after rejected time edits and truncates it only after a valid branch edit", async () => {
    const initial = await history();
    const root = selectedEditorRevisionV1(initial);
    const moved = applyEditorCommandV1(
      initial,
      { schema: root.schema, revisionHash: root.revisionHash },
      startTickCommand(root, 1, 480),
    );
    const undone = undoEditorHistoryV1(moved);
    if (!undone) throw new Error("Undo should restore the root revision.");
    const undoneRoot = selectedEditorRevisionV1(undone);
    expect(() =>
      applyEditorCommandV1(
        undone,
        { schema: undoneRoot.schema, revisionHash: undoneRoot.revisionHash },
        startTickCommand(undoneRoot, 1, 1920),
      ),
    ).toThrow(expect.objectContaining({ code: "NO_OP_EDITOR_COMMAND" }));
    expect(() =>
      applyEditorCommandV1(
        undone,
        { schema: undoneRoot.schema, revisionHash: undoneRoot.revisionHash },
        startTickCommand(undoneRoot, 1, 4000),
      ),
    ).toThrow(expect.objectContaining({ code: "EDITOR_NOTE_START_ORDER_INVALID" }));
    expect(redoEditorHistoryV1(undone)).toEqual(moved);
    const branched = applyEditorCommandV1(
      undone,
      { schema: undoneRoot.schema, revisionHash: undoneRoot.revisionHash },
      startTickCommand(undoneRoot, 1, 960),
    );
    expect(redoEditorHistoryV1(branched)).toBeNull();
    expect(branched.revisions).toHaveLength(2);
    expect(moved.revisions).toHaveLength(2);
    expect(selectedEditorRevisionV1(moved).tracks[3]?.notes[1]?.startTick).toBe(480);
    expect(selectedEditorRevisionV1(branched).tracks[3]?.notes[1]?.startTick).toBe(960);
  });
  it("validates v2 command descriptors and exact field order without invoking caller hooks", async () => {
    const current = await history();
    const root = selectedEditorRevisionV1(current);
    const valid = startTickCommand(root, 1, 480);
    let hookRan = false;
    const accessor = { ...valid };
    Object.defineProperty(accessor, "startTick", {
      enumerable: true,
      configurable: true,
      get() {
        hookRan = true;
        return 480;
      },
    });
    const withFunction = { ...valid, extension() {} };
    const withToJSON = {
      ...valid,
      toJSON() {
        hookRan = true;
        return valid;
      },
    };
    const withSymbol = { ...valid, [Symbol("extra")]: "blocked" };
    const wrongOrder = {
      type: valid.type,
      schema: valid.schema,
      noteId: valid.noteId,
      expectedStartTick: valid.expectedStartTick,
      startTick: valid.startTick,
    };
    const unsupportedExactShape = { ...valid, schema: "nightdrive.editor-note-command.v4" };
    const unsupportedMalformedShape = { ...unsupportedExactShape, extra: true };
    const attempt = (command: unknown) =>
      applyEditorCommandV1(
        current,
        { schema: root.schema, revisionHash: root.revisionHash },
        command as never,
      );
    for (const command of [accessor, withFunction, withToJSON, withSymbol, wrongOrder]) {
      expect(() => attempt(command)).toThrow(
        expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
      );
    }
    expect(() => attempt(unsupportedExactShape)).toThrow(
      expect.objectContaining({ code: "UNSUPPORTED_EDITOR_COMMAND_SCHEMA" }),
    );
    expect(() => attempt(unsupportedMalformedShape)).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
    );
    expect(hookRan).toBe(false);
    expect(current.revisions).toHaveLength(1);
    expect(current.cursor).toBe(0);
  });

  it("verifies mixed pitch/time command ancestry and preserves exact history navigation", async () => {
    const initial = await history();
    const root = selectedEditorRevisionV1(initial);
    const lead = root.tracks[3]?.notes;
    const target = lead?.[1];
    if (!target) throw new Error("Missing Lead note fixture.");
    const pitched = applyEditorCommandV1(
      initial,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: EDITOR_COMMAND_SCHEMA_V1,
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: 76,
      },
    );
    const pitchRevision = selectedEditorRevisionV1(pitched);
    const moved = applyEditorCommandV1(
      pitched,
      { schema: pitchRevision.schema, revisionHash: pitchRevision.revisionHash },
      startTickCommand(pitchRevision, 1, 1440),
    );
    const movedRevision = selectedEditorRevisionV1(moved);
    expect(movedRevision.tracks[3]?.notes[1]).toEqual({
      ...target,
      pitch: 76,
      startTick: 1440,
    });
    expect(verifyEditorRevisionV1(movedRevision, moved.source, [root, pitchRevision])).toEqual(
      movedRevision,
    );
    const undo = undoEditorHistoryV1(moved);
    if (!undo) throw new Error("Undo should select the pitch revision.");
    expect(selectedEditorRevisionV1(undo)).toEqual(pitchRevision);
    const redo = redoEditorHistoryV1(undo);
    if (!redo) throw new Error("Redo should select the time revision.");
    expect(selectedEditorRevisionV1(redo)).toEqual(movedRevision);
  });
});

function rehash(revision: EditorRevisionV1): EditorRevisionV1 {
  const { revisionHash: _old, ...content } = revision;
  return {
    ...content,
    revisionHash: createHash("sha256")
      .update(
        JSON.stringify({ schema: "nightdrive.editor-revision-hash-input.v1", revision: content }),
        "utf8",
      )
      .digest("hex"),
  };
}

it("rejects a self-consistent forged v2 timing child at verification, serialization, and child creation", async () => {
  const source = await generateCompleteSectionV1(request as never);
  const root = importCompleteSectionAsEditorRootV1(source);
  const target = root.tracks[3]?.notes[0];
  if (!target) throw new Error("Missing Lead fixture.");
  const command = {
    schema: "nightdrive.editor-note-command.v2" as const,
    type: "set-note-start-tick" as const,
    noteId: target.id,
    expectedStartTick: target.startTick,
    startTick: 480,
  };
  const validChild = createChildEditorRevisionV1(root, command, source, []);
  expect(verifyEditorRevisionV1(validChild, source, [root])).toEqual(validChild);
  expect(serializeEditorRevisionV1(validChild, source, [root])).toBe(JSON.stringify(validChild));

  const forged = structuredClone(validChild);
  const unrelated = forged.tracks[3]?.notes[1];
  if (!unrelated) throw new Error("Missing unrelated Lead fixture.");
  (unrelated as { pitch: number }).pitch = 78;
  const recomputed = rehash(forged);
  expect(recomputed.revisionHash).not.toBe(validChild.revisionHash);
  expect(() => verifyEditorRevisionV1(recomputed, source, [root])).toThrow(
    expect.objectContaining({ code: "INVALID_EDITOR_LINEAGE" }),
  );
  expect(() => serializeEditorRevisionV1(recomputed, source, [root])).toThrow();
  expect(() => createChildEditorRevisionV1(recomputed, command, source, [root])).toThrow();
});
describe("authoritative source and lineage verification", () => {
  it("rejects a self-consistent forged root at every canonical boundary", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    const forged = structuredClone(root);
    (forged.tracks[3]?.notes[0] as { pitch: number }).pitch = 76;
    const recomputed = rehash(forged);
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V1,
      type: "set-note-pitch" as const,
      noteId: recomputed.tracks[3]?.notes[0]?.id as string,
      expectedPitch: 76,
      pitch: 77,
    };
    expect(() => verifyEditorRevisionV1(recomputed, source, [])).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_SOURCE_BINDING" }),
    );
    expect(() => serializeEditorRevisionV1(recomputed, source, [])).toThrow();
    expect(() => createChildEditorRevisionV1(recomputed, command, source, [])).toThrow();
    // Runtime callers cannot omit retained source despite a self-consistent digest.
    expect(() => verifyEditorRevisionV1(recomputed, undefined as never, [])).toThrow();
    expect(() => serializeEditorRevisionV1(recomputed, undefined as never, [])).toThrow();
    expect(() =>
      createChildEditorRevisionV1(recomputed, command, undefined as never, []),
    ).toThrow();
    expect(verifyEditorRevisionV1(root, source, [])).toEqual(root);
  });

  it("rejects a self-consistent child that differs from its recorded transition", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const root = importCompleteSectionAsEditorRootV1(source);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead fixture.");
    const command = {
      schema: EDITOR_COMMAND_SCHEMA_V1,
      type: "set-note-pitch" as const,
      noteId: target.id,
      expectedPitch: target.pitch,
      pitch: 76,
    };
    const child = createChildEditorRevisionV1(root, command, source, []);
    expect(verifyEditorRevisionV1(child, source, [root])).toEqual(child);
    expect(serializeEditorRevisionV1(child, source, [root])).toBe(JSON.stringify(child));
    const forged = structuredClone(child);
    (forged.tracks[3]?.notes[1] as { pitch: number }).pitch = 78;
    const recomputed = rehash(forged);
    expect(() => verifyEditorRevisionV1(recomputed, source, [root])).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_LINEAGE" }),
    );
    expect(() => serializeEditorRevisionV1(recomputed, source, [root])).toThrow();
    expect(() => createChildEditorRevisionV1(recomputed, command, source, [root])).toThrow();
    expect(() => verifyEditorRevisionV1(child, source, [])).toThrow();
    expect(() => verifyEditorRevisionV1(child, source, [root, root])).toThrow();
  });
});

describe("M2 delete-note v4 canonical transition", () => {
  it("matches independent literal root and delete-child UTF-8 fixtures and standard SHA-256", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const actualRoot = importCompleteSectionAsEditorRootV1(source);
    const expectedRoot = independentRootRevision();
    const targetIndex = 7;
    const target = expectedRoot.tracks[3]?.notes[targetIndex];
    if (!target) throw new Error("Missing independent deletion fixture target.");
    const command = {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: target.id,
    } as const;
    const expectedChild = independentDeleteChild(expectedRoot, targetIndex);
    const actualChild = createChildEditorRevisionV1(actualRoot, command, source, []);
    const rootJson = JSON.stringify(expectedRoot);
    const childJson = JSON.stringify(expectedChild);
    const hashInput = independentRevisionHashInput(EXPECTED_DELETE_CHILD_JSON);
    const actualRootJson = serializeEditorRevisionV1(actualRoot, source, []);
    const actualChildJson = serializeEditorRevisionV1(actualChild, source, [actualRoot]);

    expect(source.resultHash).toBe(EXPECTED_START_TICK_SOURCE_HASH);
    expect(expectedRoot.revisionHash).toBe(EXPECTED_DELETE_ROOT_HASH);
    expect(rootJson).toBe(EXPECTED_DELETE_ROOT_JSON);
    expect(Buffer.from(rootJson, "utf8")).toEqual(Buffer.from(EXPECTED_DELETE_ROOT_JSON, "utf8"));
    expect(actualRootJson).toBe(EXPECTED_DELETE_ROOT_JSON);
    expect(JSON.stringify(command)).toBe(EXPECTED_DELETE_COMMAND_JSON);
    expect(expectedChild.revisionHash).toBe(EXPECTED_DELETE_CHILD_HASH);
    expect(childJson).toBe(EXPECTED_DELETE_CHILD_JSON);
    expect(Buffer.from(childJson, "utf8")).toEqual(Buffer.from(EXPECTED_DELETE_CHILD_JSON, "utf8"));
    expect(sha256Utf8(hashInput)).toBe(EXPECTED_DELETE_CHILD_HASH);
    expect(Buffer.byteLength(hashInput, "utf8")).toBe(EXPECTED_DELETE_HASH_INPUT_BYTES);
    expect(actualChildJson).toBe(EXPECTED_DELETE_CHILD_JSON);
    expect(Buffer.from(actualChildJson, "utf8")).toEqual(
      Buffer.from(EXPECTED_DELETE_CHILD_JSON, "utf8"),
    );
    expect(actualChild).toEqual(expectedChild);
    expect(actualChild.parent).toEqual({
      schema: expectedRoot.schema,
      revisionHash: expectedRoot.revisionHash,
    });
    expect(actualChild.tracks.slice(0, 3)).toEqual(expectedRoot.tracks.slice(0, 3));
    expect(actualChild.tracks[3]?.notes).toEqual(
      expectedRoot.tracks[3]?.notes.filter((_, index) => index !== targetIndex),
    );
    expect(actualChild.tracks[3]?.notes[7]?.id).toBe(expectedRoot.tracks[3]?.notes[8]?.id);
    expect(verifyEditorRevisionV1(actualChild, source, [actualRoot])).toEqual(actualChild);
  });

  it("deletes first, middle, and final notes while preserving order, stable IDs, and all other state", async () => {
    for (const deleteIndex of [0, 7, 15]) {
      const original = await history();
      const root = selectedEditorRevisionV1(original);
      const lead = root.tracks[3];
      const target = lead?.notes[deleteIndex];
      if (!lead || !target) throw new Error("Missing Lead deletion case.");
      const beforeIds = lead.notes.map((note) => note.id);
      const command = {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: target.id,
      } as const;

      const edited = applyEditorCommandV1(
        original,
        { schema: root.schema, revisionHash: root.revisionHash },
        command,
      );
      const child = selectedEditorRevisionV1(edited);
      const remaining = lead.notes.filter((_, index) => index !== deleteIndex);

      expect(edited.revisions).toHaveLength(2);
      expect(child.command).toEqual(command);
      expect(child.parent?.revisionHash).toBe(root.revisionHash);
      expect(child.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));
      expect(child.tracks[3]?.notes).toEqual(remaining);
      expect(child.tracks[3]?.notes.map((note) => note.id)).toEqual(
        beforeIds.filter((_, index) => index !== deleteIndex),
      );
      for (const [index, note] of child.tracks[3]?.notes.entries() ?? []) {
        const oldIndex = index < deleteIndex ? index : index + 1;
        expect(note.id).toBe(beforeIds[oldIndex]);
      }
      expect(verifyEditorRevisionV1(child, edited.source, [root])).toEqual(child);
      const isDeeplyFrozen = (value: unknown): boolean =>
        !value ||
        typeof value !== "object" ||
        (Object.isFrozen(value) && Object.values(value).every(isDeeplyFrozen));
      expect(isDeeplyFrozen(child)).toBe(true);
    }
  });

  it("allows a fully deleted Lead track without changing the other roles", async () => {
    const current = await history();
    const source = current.source;
    const root = selectedEditorRevisionV1(current);
    const revisions: EditorRevisionV1[] = [root];
    let parent = root;
    while (parent.tracks[3]?.notes[0]) {
      const target = parent.tracks[3].notes[0];
      const child = createChildEditorRevisionV1(
        parent,
        {
          schema: "nightdrive.editor-note-command.v4",
          type: "delete-note",
          noteId: target.id,
        },
        source,
        revisions.slice(0, -1),
      );
      revisions.push(child);
      parent = child;
    }
    expect(parent.tracks[3]?.notes).toEqual([]);
    expect(parent.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));
    expect(verifyEditorRevisionV1(parent, source, revisions.slice(0, -1))).toEqual(parent);
  }, 20000);

  it("preserves permitted overlap, command order, and unchanged role values", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const first = root.tracks[3]?.notes[0];
    const target = root.tracks[3]?.notes[7];
    if (!first || !target) throw new Error("Missing overlap fixture.");
    const overlapping = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: "nightdrive.editor-note-command.v3",
        type: "set-note-duration",
        noteId: first.id,
        expectedDurationTicks: first.durationTicks,
        durationTicks: 2400,
      },
    );
    const parent = selectedEditorRevisionV1(overlapping);
    const beforeLead = parent.tracks[3]?.notes;
    const otherTracks = parent.tracks.slice(0, 3);
    const deleted = applyEditorCommandV1(
      overlapping,
      { schema: parent.schema, revisionHash: parent.revisionHash },
      {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: target.id,
      },
    );
    const child = selectedEditorRevisionV1(deleted);
    const remaining = child.tracks[3]?.notes ?? [];
    expect(remaining[0]?.startTick).toBe(0);
    expect(remaining[0]?.startTick + (remaining[0]?.durationTicks ?? 0)).toBeGreaterThan(
      remaining[1]?.startTick ?? Number.MAX_SAFE_INTEGER,
    );
    expect(child.tracks.slice(0, 3)).toEqual(otherTracks);
    expect(remaining).toEqual(beforeLead?.filter((note) => note.id !== target.id));
  });

  it("rejects unknown/non-Lead targets and malformed descriptor-unsafe v4 records without partial history", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const target = root.tracks[3]?.notes[0];
    const nonLead = root.tracks[1]?.notes[0];
    if (!target || !nonLead) throw new Error("Missing command rejection fixture.");
    const before = structuredClone(original);
    const apply = (command: unknown) =>
      applyEditorCommandV1(
        original,
        { schema: root.schema, revisionHash: root.revisionHash },
        command as never,
      );
    const unknownId = `note-${"0".repeat(64)}`;
    expect(root.tracks.some((track) => track.notes.some((note) => note.id === unknownId))).toBe(
      false,
    );
    expect(() =>
      apply({
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: unknownId,
      }),
    ).toThrow(expect.objectContaining({ code: "EDITOR_NOTE_NOT_FOUND", field: "command.noteId" }));
    expect(() =>
      apply({
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: nonLead.id,
      }),
    ).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_NOT_EDITABLE", field: "command.noteId" }),
    );

    let getterCalls = 0;
    const accessor = { schema: "nightdrive.editor-note-command.v4", type: "delete-note" };
    Object.defineProperty(accessor, "noteId", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return target.id;
      },
    });
    const withSymbol = {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: target.id,
      [Symbol("extra")]: true,
    };
    const withToJSON = {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: target.id,
      toJSON() {
        getterCalls += 1;
        return {};
      },
    };
    const malformed: readonly unknown[] = [
      accessor,
      withSymbol,
      withToJSON,
      Object.assign(Object.create({ inherited: true }), {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: target.id,
      }),
      {
        noteId: target.id,
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
      },
      { schema: "nightdrive.editor-note-command.v4", type: "delete-note" },
      {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: target.id,
        extra: true,
      },
      {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: "not-a-canonical-note-id",
      },
    ];
    for (const command of malformed)
      expect(() => apply(command)).toThrow(
        expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
      );
    expect(getterCalls).toBe(0);
    expect(() =>
      apply({ schema: "nightdrive.editor-note-command.v4", type: "other", noteId: target.id }),
    ).toThrow(
      expect.objectContaining({ code: "UNSUPPORTED_EDITOR_COMMAND_TYPE", field: "command.type" }),
    );
    expect(() =>
      apply({
        schema: "nightdrive.editor-note-command.v9",
        type: "delete-note",
        noteId: target.id,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "UNSUPPORTED_EDITOR_COMMAND_SCHEMA",
        field: "command.schema",
      }),
    );
    expect(original).toEqual(before);
  });

  it("checks history and parent before command validation and retains redo after a rejected delete", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const first = root.tracks[3]?.notes[0];
    const second = root.tracks[3]?.notes[1];
    if (!first || !second) throw new Error("Missing history fixture.");
    const firstDelete = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: first.id,
      },
    );
    const afterFirst = selectedEditorRevisionV1(firstDelete);
    const secondDelete = applyEditorCommandV1(
      firstDelete,
      { schema: afterFirst.schema, revisionHash: afterFirst.revisionHash },
      {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: second.id,
      },
    );
    const undone = undoEditorHistoryV1(secondDelete);
    if (!undone) throw new Error("Undo should expose the redo path.");
    const unchanged = structuredClone(undone);
    expect(() =>
      applyEditorCommandV1(
        undone,
        { schema: afterFirst.schema, revisionHash: afterFirst.revisionHash },
        null as never,
      ),
    ).toThrow(expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }));
    expect(undone).toEqual(unchanged);
    expect(redoEditorHistoryV1(undone)).toEqual(secondDelete);
    expect(() =>
      applyEditorCommandV1(
        undone,
        { schema: afterFirst.schema, revisionHash: "f".repeat(64) },
        null as never,
      ),
    ).toThrow(expect.objectContaining({ code: "STALE_EDITOR_PARENT" }));
    expect(redoEditorHistoryV1(undone)).toEqual(secondDelete);
  });

  it("restores exact delete revisions through undo/redo and truncates redo only after a successful branch delete", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const first = root.tracks[3]?.notes[0];
    const second = root.tracks[3]?.notes[1];
    if (!first || !second) throw new Error("Missing history fixture.");
    const firstDelete = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      { schema: "nightdrive.editor-note-command.v4", type: "delete-note", noteId: first.id },
    );
    const firstChild = selectedEditorRevisionV1(firstDelete);
    const secondDelete = applyEditorCommandV1(
      firstDelete,
      { schema: firstChild.schema, revisionHash: firstChild.revisionHash },
      { schema: "nightdrive.editor-note-command.v4", type: "delete-note", noteId: second.id },
    );
    const secondChild = selectedEditorRevisionV1(secondDelete);
    const undone = undoEditorHistoryV1(secondDelete);
    if (!undone) throw new Error("Undo should restore the first deletion.");
    expect(selectedEditorRevisionV1(undone)).toEqual(firstChild);
    const redone = redoEditorHistoryV1(undone);
    if (!redone) throw new Error("Redo should restore the second deletion.");
    expect(selectedEditorRevisionV1(redone)).toEqual(secondChild);
    const branchBase = undoEditorHistoryV1(redone);
    if (!branchBase) throw new Error("Undo should restore the branch parent.");
    const selected = selectedEditorRevisionV1(branchBase);
    const branchTarget = selected.tracks[3]?.notes[0];
    if (!branchTarget) throw new Error("Missing branch deletion target.");
    const branched = applyEditorCommandV1(
      branchBase,
      { schema: selected.schema, revisionHash: selected.revisionHash },
      {
        schema: "nightdrive.editor-note-command.v4",
        type: "delete-note",
        noteId: branchTarget.id,
      },
    );
    expect(branched.revisions).toHaveLength(branchBase.cursor + 2);
    expect(redoEditorHistoryV1(branched)).toBeNull();
    expect(secondDelete.revisions[2]).toEqual(secondChild);
    expect(
      verifyEditorRevisionV1(secondChild, secondDelete.source, secondDelete.revisions.slice(0, 2)),
    ).toEqual(secondChild);
  });

  it("rejects duplicate IDs and self-consistent forged roots/children at authoritative boundaries", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const source = original.source;
    const duplicate = structuredClone(root);
    const duplicatedLead = duplicate.tracks[3]?.notes;
    if (!duplicatedLead || duplicatedLead.length < 2)
      throw new Error("Missing duplicate-ID fixture.");
    const firstId = duplicatedLead[0]?.id;
    if (!firstId) throw new Error("Missing first duplicate fixture ID.");
    (duplicatedLead[1] as { id: string }).id = firstId;
    const duplicateWithHash = rehash(duplicate);
    expect(() => verifyEditorRevisionV1(duplicateWithHash, source, [])).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_REVISION" }),
    );

    const forgedRoot = structuredClone(root);
    (forgedRoot.tracks[3]?.notes[0] as { pitch: number }).pitch += 1;
    const rehashedRoot = rehash(forgedRoot);
    const command = {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: root.tracks[3]?.notes[0]?.id as string,
    } as const;
    expect(() => verifyEditorRevisionV1(rehashedRoot, source, [])).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_SOURCE_BINDING" }),
    );
    expect(() => serializeEditorRevisionV1(rehashedRoot, source, [])).toThrow();
    expect(() => createChildEditorRevisionV1(rehashedRoot, command, source, [])).toThrow();

    const validChild = createChildEditorRevisionV1(root, command, source, []);
    const forgedChild = structuredClone(validChild);
    const unrelated = forgedChild.tracks[3]?.notes[0];
    if (!unrelated) throw new Error("Missing forged-child fixture.");
    (unrelated as { pitch: number }).pitch += 1;
    const rehashedChild = rehash(forgedChild);
    expect(() => verifyEditorRevisionV1(rehashedChild, source, [root])).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_LINEAGE" }),
    );
    expect(() => serializeEditorRevisionV1(rehashedChild, source, [root])).toThrow();
    expect(() => createChildEditorRevisionV1(rehashedChild, command, source, [root])).toThrow();
  });

  it("replays the same verified delete deterministically", async () => {
    const sourceHistory = await history();
    const root = selectedEditorRevisionV1(sourceHistory);
    const target = root.tracks[3]?.notes[4];
    if (!target) throw new Error("Missing deterministic deletion target.");
    const command = {
      schema: "nightdrive.editor-note-command.v4",
      type: "delete-note",
      noteId: target.id,
    } as const;
    const expectedParent = { schema: root.schema, revisionHash: root.revisionHash };
    const first = applyEditorCommandV1(sourceHistory, expectedParent, command);
    const second = applyEditorCommandV1(sourceHistory, expectedParent, command);
    expect(selectedEditorRevisionV1(first)).toEqual(selectedEditorRevisionV1(second));
    expect(
      serializeEditorRevisionV1(
        selectedEditorRevisionV1(first),
        first.source,
        first.revisions.slice(0, -1),
      ),
    ).toBe(
      serializeEditorRevisionV1(
        selectedEditorRevisionV1(second),
        second.source,
        second.revisions.slice(0, -1),
      ),
    );
  });
});

describe("M2 set-note-position v5 canonical transition", () => {
  const expectedCommandJson =
    '{"schema":"nightdrive.editor-note-command.v5","type":"set-note-position","noteId":"note-853ab61d8567f96e2baeaeb213560536422465a0742b27bb4775fd65cfafad12","expectedPitch":75,"expectedStartTick":0,"pitch":76,"startTick":480}';

  it("matches an independent root projection, exact command bytes, child bytes, and test-side SHA-256", async () => {
    const source = await generateCompleteSectionV1(request as never);
    const original = await history();
    const actualRoot = selectedEditorRevisionV1(original);
    const expectedRoot = independentRootRevision();
    const command = positionCommand(expectedRoot, 0, 76, 480);
    const expectedChild = independentPositionChild(expectedRoot, 0, 76, 480);
    const expectedChildJson = JSON.stringify(expectedChild);
    const hashInput = independentRevisionHashInput(expectedChildJson);
    const changed = applyEditorCommandV1(
      original,
      { schema: actualRoot.schema, revisionHash: actualRoot.revisionHash },
      command,
    );
    const actualChild = selectedEditorRevisionV1(changed);
    const actualChildJson = serializeEditorRevisionV1(
      actualChild,
      changed.source,
      changed.revisions.slice(0, -1),
    );

    expect(source.resultHash).toBe(EXPECTED_START_TICK_SOURCE_HASH);
    expect(actualRoot).toEqual(expectedRoot);
    expect(JSON.stringify(command)).toBe(expectedCommandJson);
    expect(Buffer.from(JSON.stringify(command), "utf8")).toEqual(
      Buffer.from(expectedCommandJson, "utf8"),
    );
    expect(expectedChild.revisionHash).toBe(
      "07c545d345f98532e7d85f73c392739691613081eb55792dade3d09c9feed695",
    );
    expect(sha256Utf8(hashInput)).toBe(
      "07c545d345f98532e7d85f73c392739691613081eb55792dade3d09c9feed695",
    );
    expect(Buffer.byteLength(hashInput, "utf8")).toBe(12289);
    expect(actualChild).toEqual(expectedChild);
    expect(actualChildJson).toBe(expectedChildJson);
    expect(Buffer.from(actualChildJson, "utf8")).toEqual(Buffer.from(expectedChildJson, "utf8"));
    expect(verifyEditorRevisionV1(actualChild, source, [actualRoot])).toEqual(expectedChild);
    expect(changed.revisions).toHaveLength(2);
    expect(changed.cursor).toBe(1);
  });

  it("changes only the requested fields, preserves identity/order/state, and carries either unchanged axis", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing Lead position fixture.");
    const scenarios = [
      { pitch: target.pitch + 1, startTick: target.startTick },
      { pitch: target.pitch, startTick: target.startTick + 480 },
      { pitch: target.pitch + 1, startTick: target.startTick + 480 },
    ];

    for (const replacement of scenarios) {
      const changed = applyEditorCommandV1(
        original,
        { schema: root.schema, revisionHash: root.revisionHash },
        positionCommand(root, 0, replacement.pitch, replacement.startTick),
      );
      const child = selectedEditorRevisionV1(changed);
      const nextLead = child.tracks[3]?.notes;
      if (!nextLead) throw new Error("Missing changed Lead track.");
      expect(changed.revisions).toHaveLength(2);
      expect(child.command?.type).toBe("set-note-position");
      expect(nextLead).toHaveLength(root.tracks[3]?.notes.length);
      expect(nextLead.map((note) => note.id)).toEqual(root.tracks[3]?.notes.map((note) => note.id));
      expect(nextLead[0]).toEqual({ ...target, ...replacement });
      expect(nextLead.slice(1)).toEqual(root.tracks[3]?.notes.slice(1));
      expect(child.tracks.slice(0, 3)).toEqual(root.tracks.slice(0, 3));
      expect(child.source).toEqual(root.source);
      expect(child.section).toEqual(root.section);
      expect(recursivelyFrozen(child)).toBe(true);
      expect(recursivelyFrozen(changed)).toBe(true);
    }
    expect(root.tracks[3]?.notes[0]).toEqual(target);
    expect(original.revisions).toHaveLength(1);
  });

  it("restores the exact one-step parent/child and truncates redo only after a successful branch edit", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing history fixture.");
    const first = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      {
        schema: "nightdrive.editor-note-command.v1",
        type: "set-note-pitch",
        noteId: target.id,
        expectedPitch: target.pitch,
        pitch: target.pitch - 1,
      },
    );
    const firstRevision = selectedEditorRevisionV1(first);
    const oldFuture = applyEditorCommandV1(
      first,
      { schema: firstRevision.schema, revisionHash: firstRevision.revisionHash },
      {
        schema: "nightdrive.editor-note-command.v2",
        type: "set-note-start-tick",
        noteId: target.id,
        expectedStartTick: target.startTick,
        startTick: 480,
      },
    );
    const oldFutureRevision = selectedEditorRevisionV1(oldFuture);
    const undone = undoEditorHistoryV1(oldFuture);
    if (!undone) throw new Error("Undo should select the v1 parent.");
    const selected = selectedEditorRevisionV1(undone);
    const selectedTarget = selected.tracks[3]?.notes[0];
    if (!selectedTarget) throw new Error("Missing selected Lead note.");
    const noOp = positionCommand(selected, 0, selectedTarget.pitch, selectedTarget.startTick);
    const beforeRejected = structuredClone(undone);

    expect(() =>
      applyEditorCommandV1(
        undone,
        { schema: selected.schema, revisionHash: selected.revisionHash },
        noOp,
      ),
    ).toThrow(expect.objectContaining({ code: "NO_OP_EDITOR_COMMAND", field: "command" }));
    expect(undone).toEqual(beforeRejected);
    expect(redoEditorHistoryV1(undone)).toEqual(oldFuture);
    expect(() =>
      applyEditorCommandV1(
        undone,
        { schema: selected.schema, revisionHash: selected.revisionHash },
        { ...noOp, expectedPitch: selectedTarget.pitch - 1 },
      ),
    ).toThrow(
      expect.objectContaining({ code: "STALE_EDITOR_NOTE_VALUE", field: "command.expectedPitch" }),
    );
    expect(undone).toEqual(beforeRejected);
    expect(redoEditorHistoryV1(undone)).toEqual(oldFuture);

    const branch = applyEditorCommandV1(
      undone,
      { schema: selected.schema, revisionHash: selected.revisionHash },
      positionCommand(selected, 0, (selected.tracks[3]?.notes[0]?.pitch ?? 0) + 1, 480),
    );
    const branchRevision = selectedEditorRevisionV1(branch);
    expect(branch.revisions).toHaveLength(3);
    expect(branch.cursor).toBe(2);
    expect(branchRevision.parent?.revisionHash).toBe(selected.revisionHash);
    expect(redoEditorHistoryV1(branch)).toBeNull();
    const branchUndone = undoEditorHistoryV1(branch);
    if (!branchUndone) throw new Error("Undo should return to the branch parent.");
    expect(branchUndone.revisions[1]).toEqual(firstRevision);
    const branchRedone = redoEditorHistoryV1(branchUndone);
    if (!branchRedone) throw new Error("Redo should restore the position child.");
    expect(branchRedone.revisions[2]).toEqual(branchRevision);
    expect(oldFuture.revisions[2]).toEqual(oldFutureRevision);
  });

  it("replays deterministically and rejects unverified source roots or forged child transitions", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing lineage fixture.");
    const command = positionCommand(root, 0, target.pitch + 1, target.startTick + 480);
    const parentIdentity = { schema: root.schema, revisionHash: root.revisionHash };
    const first = applyEditorCommandV1(original, parentIdentity, command);
    const replay = applyEditorCommandV1(original, parentIdentity, command);
    expect(selectedEditorRevisionV1(first)).toEqual(selectedEditorRevisionV1(replay));
    expect(
      serializeEditorRevisionV1(
        selectedEditorRevisionV1(first),
        first.source,
        first.revisions.slice(0, -1),
      ),
    ).toBe(
      serializeEditorRevisionV1(
        selectedEditorRevisionV1(replay),
        replay.source,
        replay.revisions.slice(0, -1),
      ),
    );

    const forgedRootContent = {
      ...root,
      tracks: root.tracks.map((track, index) =>
        index !== 3
          ? track
          : {
              ...track,
              notes: track.notes.map((note, index) =>
                index === 1 ? { ...note, pitch: note.pitch - 1 } : note,
              ),
            },
      ),
    };
    const { revisionHash: _rootHash, ...forgedRootBase } = forgedRootContent;
    const forgedRoot = independentlyHashedRevision(forgedRootBase);
    const forgedRootHistory = { source: original.source, revisions: [forgedRoot], cursor: 0 };
    const forgedTarget = forgedRoot.tracks[3]?.notes[0];
    if (!forgedTarget) throw new Error("Missing forged root target.");
    expect(() =>
      applyEditorCommandV1(
        forgedRootHistory,
        { schema: forgedRoot.schema, revisionHash: forgedRoot.revisionHash },
        positionCommand(forgedRoot, 0, forgedTarget.pitch + 1, forgedTarget.startTick + 480),
      ),
    ).toThrow(expect.objectContaining({ code: "INVALID_EDITOR_SOURCE_BINDING" }));

    const validChild = selectedEditorRevisionV1(first);
    const forgedChildContent = {
      ...validChild,
      tracks: validChild.tracks.map((track, index) =>
        index !== 3
          ? track
          : {
              ...track,
              notes: track.notes.map((note, index) =>
                index === 1 ? { ...note, pitch: note.pitch - 1 } : note,
              ),
            },
      ),
    };
    const { revisionHash: _childHash, ...forgedChildBase } = forgedChildContent;
    const forgedChild = independentlyHashedRevision(forgedChildBase);
    const forgedChildHistory = {
      source: first.source,
      revisions: [root, forgedChild],
      cursor: 1,
    };
    expect(() => selectedEditorRevisionV1(forgedChildHistory)).toThrow(
      expect.objectContaining({ code: "INVALID_EDITOR_LINEAGE" }),
    );
  });

  it("enforces stale-value and mixed-validation precedence without mutating history", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const target = root.tracks[3]?.notes[0];
    if (!target) throw new Error("Missing validation fixture.");
    const apply = (command: unknown) =>
      applyEditorCommandV1(
        original,
        { schema: root.schema, revisionHash: root.revisionHash },
        command as never,
      );
    const command = positionCommand(root, 0, target.pitch + 1, target.startTick + 480);
    const before = structuredClone(original);

    expect(() => apply({ ...command, expectedPitch: target.pitch - 1 })).toThrow(
      expect.objectContaining({ code: "STALE_EDITOR_NOTE_VALUE", field: "command.expectedPitch" }),
    );
    expect(() => apply({ ...command, expectedStartTick: target.startTick + 1 })).toThrow(
      expect.objectContaining({
        code: "STALE_EDITOR_NOTE_VALUE",
        field: "command.expectedStartTick",
      }),
    );
    expect(() =>
      apply({
        ...command,
        expectedPitch: target.pitch - 1,
        expectedStartTick: target.startTick + 1,
      }),
    ).toThrow(
      expect.objectContaining({ code: "STALE_EDITOR_NOTE_VALUE", field: "command.expectedPitch" }),
    );
    expect(() => apply({ ...command, pitch: 85, startTick: -1 })).toThrow(
      expect.objectContaining({ code: "EDITOR_LEAD_PITCH_OUT_OF_RANGE", field: "command.pitch" }),
    );
    expect(() => apply({ ...command, startTick: -1 })).toThrow(
      expect.objectContaining({
        code: "EDITOR_NOTE_START_OUT_OF_RANGE",
        field: "command.startTick",
      }),
    );
    expect(() => apply({ ...command, schema: "nightdrive.editor-note-command.v9" })).toThrow(
      expect.objectContaining({
        code: "UNSUPPORTED_EDITOR_COMMAND_SCHEMA",
        field: "command.schema",
      }),
    );
    expect(() => apply({ ...command, type: "other" })).toThrow(
      expect.objectContaining({ code: "UNSUPPORTED_EDITOR_COMMAND_TYPE", field: "command.type" }),
    );
    expect(() => apply({ ...command, pitch: 59 })).toThrow(
      expect.objectContaining({ code: "EDITOR_LEAD_PITCH_OUT_OF_RANGE", field: "command.pitch" }),
    );
    expect(() => apply({ ...command, pitch: 85 })).toThrow(
      expect.objectContaining({ code: "EDITOR_LEAD_PITCH_OUT_OF_RANGE", field: "command.pitch" }),
    );
    expect(() => apply({ ...command, startTick: 30720 })).toThrow(
      expect.objectContaining({
        code: "EDITOR_NOTE_START_OUT_OF_RANGE",
        field: "command.startTick",
      }),
    );
    expect(() => apply({ ...command, noteId: `note-${"0".repeat(64)}` })).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_NOT_FOUND", field: "command.noteId" }),
    );
    const nonLead = root.tracks[0]?.notes[0];
    if (!nonLead) throw new Error("Missing non-Lead fixture.");
    expect(() => apply({ ...command, noteId: nonLead.id })).toThrow(
      expect.objectContaining({ code: "EDITOR_NOTE_NOT_EDITABLE", field: "command.noteId" }),
    );
    expect(original).toEqual(before);
  });

  it("validates descriptor-safe ordered fields and final-state timing, order, and overlap rules", async () => {
    const original = await history();
    const root = selectedEditorRevisionV1(original);
    const target = root.tracks[3]?.notes[0];
    const finalTarget = root.tracks[3]?.notes.at(-1);
    const middleTarget = root.tracks[3]?.notes[2];
    if (!target || !finalTarget || !middleTarget) throw new Error("Missing boundary fixtures.");
    const apply = (command: unknown) =>
      applyEditorCommandV1(
        original,
        { schema: root.schema, revisionHash: root.revisionHash },
        command as never,
      );
    let getterCalls = 0;
    const accessor = positionCommand(root, 0, target.pitch + 1, target.startTick + 480);
    Object.defineProperty(accessor, "expectedPitch", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return target.pitch;
      },
    });
    const symbolExtra = { ...positionCommand(root, 0, target.pitch + 1, target.startTick + 480) };
    Object.defineProperty(symbolExtra, Symbol("extra"), { value: true, enumerable: true });
    const withToJSON = {
      ...positionCommand(root, 0, target.pitch + 1, target.startTick + 480),
      toJSON() {
        getterCalls += 1;
        return {};
      },
    };
    const reordered = JSON.parse(JSON.stringify(positionCommand(root, 0, target.pitch + 1, 480)));
    const reorderedCommand = {
      schema: reordered.schema,
      type: reordered.type,
      noteId: reordered.noteId,
      expectedStartTick: reordered.expectedStartTick,
      expectedPitch: reordered.expectedPitch,
      pitch: reordered.pitch,
      startTick: reordered.startTick,
    };
    const malformed: readonly unknown[] = [
      accessor,
      symbolExtra,
      withToJSON,
      { ...positionCommand(root, 0, target.pitch + 1, 480), extra: true },
      {
        schema: EDITOR_COMMAND_SCHEMA_V5,
        type: "set-note-position",
        noteId: target.id,
        expectedPitch: target.pitch,
        expectedStartTick: target.startTick,
        pitch: target.pitch + 1,
      },
      reorderedCommand,
      { ...positionCommand(root, 0, target.pitch + 1, 480), expectedPitch: 1.5 },
      { ...positionCommand(root, 0, target.pitch + 1, 480), expectedPitch: 128 },
      { ...positionCommand(root, 0, target.pitch + 1, 480), expectedStartTick: Number.NaN },
      { ...positionCommand(root, 0, target.pitch + 1, 480), expectedStartTick: 1.5 },
      { ...positionCommand(root, 0, target.pitch + 1, 480), pitch: "76" },
      { ...positionCommand(root, 0, target.pitch + 1, 480), startTick: Number.POSITIVE_INFINITY },
      Object.assign(
        Object.create({ inherited: true }),
        positionCommand(root, 0, target.pitch + 1, 480),
      ),
    ];
    for (const candidate of malformed)
      expect(() => apply(candidate)).toThrow(
        expect.objectContaining({ code: "INVALID_EDITOR_COMMAND" }),
      );
    expect(getterCalls).toBe(0);
    expect(() =>
      apply({
        schema: "nightdrive.editor-note-command.v5",
        type: "set-note-position",
        noteId: target.id,
        expectedPitch: target.pitch,
        expectedStartTick: target.startTick,
        pitch: 128,
        startTick: 480,
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_EDITOR_COMMAND", field: "command.pitch" }));

    const leftInclusive = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      positionCommand(root, 2, middleTarget.pitch + 1, root.tracks[3]?.notes[1]?.startTick ?? 0),
    );
    const rightInclusive = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      positionCommand(root, 2, middleTarget.pitch + 1, root.tracks[3]?.notes[3]?.startTick ?? 0),
    );
    expect(selectedEditorRevisionV1(leftInclusive).tracks[3]?.notes[2]?.startTick).toBe(1920);
    expect(selectedEditorRevisionV1(rightInclusive).tracks[3]?.notes[2]?.startTick).toBe(5760);
    expect(() => apply(positionCommand(root, 2, middleTarget.pitch + 1, 1919))).toThrow(
      expect.objectContaining({
        code: "EDITOR_NOTE_START_ORDER_INVALID",
        field: "command.startTick",
      }),
    );
    expect(() => apply(positionCommand(root, 2, middleTarget.pitch + 1, 5761))).toThrow(
      expect.objectContaining({
        code: "EDITOR_NOTE_START_ORDER_INVALID",
        field: "command.startTick",
      }),
    );
    for (const pitch of [60, 84]) {
      const pitchBoundary = applyEditorCommandV1(
        original,
        { schema: root.schema, revisionHash: root.revisionHash },
        positionCommand(root, 0, pitch, target.startTick),
      );
      expect(selectedEditorRevisionV1(pitchBoundary).tracks[3]?.notes[0]?.pitch).toBe(pitch);
    }
    const finalBoundary = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      positionCommand(root, 15, finalTarget.pitch + 1, 29760),
    );
    expect(selectedEditorRevisionV1(finalBoundary).tracks[3]?.notes[15]?.startTick).toBe(29760);
    expect(() => apply(positionCommand(root, 15, finalTarget.pitch + 1, 29761))).toThrow(
      expect.objectContaining({
        code: "EDITOR_NOTE_START_OUT_OF_RANGE",
        field: "command.startTick",
      }),
    );
    const overlap = applyEditorCommandV1(
      original,
      { schema: root.schema, revisionHash: root.revisionHash },
      positionCommand(root, 0, target.pitch + 1, 1500),
    );
    expect(selectedEditorRevisionV1(overlap).tracks[3]?.notes[0]?.startTick).toBe(1500);
  });
});

function recursivelyFrozen(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  return Object.isFrozen(value) && Object.values(value).every(recursivelyFrozen);
}
