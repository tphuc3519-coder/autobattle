#!/usr/bin/env python3
"""Chẻ pack.json thành nhiều mảnh nhỏ trong assets/pack/.

Vì sao phải chẻ (ba chuyện cùng một gốc — một file 25 MB):
  1. Git không delta được JSON base64, nên MỖI lần xuất lại gói là repo phồng thêm
     nguyên 25 MB, vĩnh viễn. Chẻ ra thì đổi ảnh một nhân vật chỉ ghi lại đúng file
     của người đó.
  2. Chrome KHÔNG cache nổi một mục 25 MB (mỗi mục có trần cỡ), nên lần nào mở trang
     cũng tải lại từ đầu. Mảnh vài trăm KB thì cache ngon.
  3. Trần 100 MB của GitHub cho một file — chẻ ra là không bao giờ đụng tới.

Cách dùng:
    python3 tools/split_pack.py pack.json            # ghi vào assets/pack/
    python3 tools/split_pack.py pack.json -o thu-muc-khac

Ra:
    assets/pack/index.json     danh mục: mảnh nào, khoá nào, nặng bao nhiêu byte
    assets/pack/spr.<key>.json      ảnh của một nhân vật  {"d": {tư thế: [dataURL…]}}
    assets/pack/sfx.<ten-o>.json    một ô tiếng            {"d": "data:audio/…"}
    assets/pack/bgm.<ten-o>.json    một bài nhạc nền       {"d": "data:audio/…"}

Hai luật, đừng phá:
  · Ghi JSON KHÔNG có khoảng trắng và SẮP KHOÁ (`sort_keys`). Mảnh nào nội dung y
    như cũ thì byte cũng y như cũ, git nhìn ra là không đổi. Đổi cách ghi là mọi
    mảnh cùng "đổi" một lượt và mất sạch cái lợi ở trên.
  · Ngày tháng (`at`) chỉ nằm trong `index.json`, TUYỆT ĐỐI không nhét vào mảnh —
    nhét vào là lần xuất nào cũng ghi lại cả 69 file.
"""
import argparse, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AN_TOAN = re.compile(r'^[A-Za-z0-9_.-]+$')


def ghi(duong, obj):
    """Ghi mảnh rồi trả về số byte. Nội dung không đổi thì không đụng vào file —
    giữ nguyên mtime cho mấy công cụ khác khỏi tưởng có thay đổi."""
    txt = json.dumps(obj, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    raw = txt.encode('utf-8')
    if os.path.exists(duong):
        with open(duong, 'rb') as f:
            if f.read() == raw:
                return len(raw), False
    with open(duong, 'wb') as f:
        f.write(raw)
    return len(raw), True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pack', help='file pack.json xuất ra từ trang xưởng')
    ap.add_argument('-o', '--out', default=os.path.join(ROOT, 'assets', 'pack'),
                    help='thư mục đích (mặc định assets/pack)')
    a = ap.parse_args()

    with open(a.pack, encoding='utf-8') as f:
        d = json.load(f)
    if not isinstance(d, dict) or ('spr' not in d and 'sfx' not in d):
        sys.exit('Không phải file pack.json hợp lệ (thiếu cả spr lẫn sfx).')

    os.makedirs(a.out, exist_ok=True)
    parts, moi, cu = [], 0, 0

    def them(kind, key, noi_dung):
        nonlocal moi, cu
        if not AN_TOAN.match(key):
            print(f'  BỎ QUA khoá lạ: {kind}/{key}')
            return
        ten = f'{kind}.{key}.json'
        b, da_ghi = ghi(os.path.join(a.out, ten), {'d': noi_dung})
        parts.append({'f': ten, 'k': kind, 'key': key, 'b': b})
        if da_ghi:
            moi += 1
        else:
            cu += 1

    for key, poses in sorted((d.get('spr') or {}).items()):
        poses = {p: v for p, v in poses.items() if v}
        if poses:
            them('spr', key, poses)
    for key, src in sorted((d.get('sfx') or {}).items()):
        if src:
            them('sfx', key, src)
    for key, src in sorted((d.get('bgm') or {}).items()):
        if src:
            them('bgm', key, src)

    parts.sort(key=lambda p: (p['k'], p['key']))
    idx = {'v': 2, 'at': d.get('at') or '', 'parts': parts}
    with open(os.path.join(a.out, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')

    # Mảnh của lần chẻ trước mà lần này không còn: xoá đi, không thì trang chơi
    # vẫn nạp ô đã bị bạn xoá khỏi xưởng.
    giu = {p['f'] for p in parts} | {'index.json', 'README.md', 'pack.json'}
    thua = [n for n in sorted(os.listdir(a.out))
            if n.endswith('.json') and n not in giu]
    for n in thua:
        os.remove(os.path.join(a.out, n))

    tong = sum(p['b'] for p in parts)
    lon = max(parts, key=lambda p: p['b']) if parts else None
    print(f'{len(parts)} mảnh · {tong/1048576:.1f} MB · {moi} mảnh đổi, {cu} mảnh y như cũ')
    if thua:
        print(f'  xoá {len(thua)} mảnh thừa: {", ".join(thua[:6])}{"…" if len(thua) > 6 else ""}')
    if lon:
        print(f'  mảnh nặng nhất: {lon["f"]} ({lon["b"]/1048576:.2f} MB)')
    for k, nhan in (('spr', 'ảnh'), ('sfx', 'tiếng'), ('bgm', 'nhạc')):
        n = [p for p in parts if p['k'] == k]
        if n:
            print(f'  {nhan}: {len(n)} mảnh, {sum(p["b"] for p in n)/1048576:.1f} MB')


if __name__ == '__main__':
    main()
