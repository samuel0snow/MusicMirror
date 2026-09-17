import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWiki, wikiResponse } from '../../apps/api/src/modules/netease-api/wiki.js';

test('wiki parses only song base fields, keeping recommendation tags separate and rejecting invalid dates', () => {
  const base = [
    { title: '曲风', wikiSubMetaVos: [{ id: 100, text: '测试曲风' }, { id: 100, text: '测试曲风' }] },
    { title: '推荐标签', wikiSubMetaVos: [{ id: 200, text: '欢快' }] },
    { title: '语种', content: '日语' }, { title: 'BPM', content: '171' },
    { title: '发行时间', content: '2020-02-30' },
  ];
  const body = wikiResponse.parse({ code: 200, data: { blocks: [
    { bizCode: 'songWikiFirstListen', rnData: { blocks: [{ blockCode: 'wikiSubBlockBaseInfoVo', blockInfo: { wikiSubElementVos: [{ title: '语种', content: '错误值' }] } }] } },
    { bizCode: 'songDetailNewSongWiki', rnData: { blocks: [
      { blockCode: 'wikiSubBlockBaseInfoVo', blockInfo: { wikiSubElementVos: base } },
      { blockCode: 'wikiSubBlockSheetInfoVo', blockInfo: { wikiSubElementVos: [{ title: 'BPM', content: '50' }] } }
    ] } }
  ] } });
  const result = parseWiki(body, '2026-09-17T00:00:00Z');
  assert.deepEqual(result.styleIds, ['100']); assert.equal(result.recommendationTags[0].id, '200');
  assert.equal(result.language, '日语'); assert.equal(result.bpm, 171); assert.equal(result.wikiPublishTime, undefined);
  assert.equal(result.enrichment.status, 'available');
  assert.equal(parseWiki(wikiResponse.parse({ code: 200, data: { blocks: [] } }), '2026-09-17T00:00:00Z').enrichment.status, 'empty');
  assert.equal(wikiResponse.safeParse({ code: 200, data: { changed: [] } }).success, false);
});
