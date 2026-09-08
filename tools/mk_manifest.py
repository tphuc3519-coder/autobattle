#!/usr/bin/env python3
"""Quét thư mục assets/voice rồi ghi lại manifest.json theo đúng những file đang có.

Vì sao cần: `voicePack()` trong game nạp **mọi ô** có tên trong `manifest.json`, chứ không
riêng chín ô giọng máy — nhưng nó không tự liệt kê được thư mục (mở qua http thì không có
lệnh "liệt kê thư mục"). Vậy nên thảy file vào repo xong phải chạy script này một lần để
ghi danh sách ra, rồi commit cả hai.

    python3 tools/mk_manifest.py

Tên file phải đúng TÊN Ô (`punch.mp3`, `ginyu_force.wav`…). Trong xưởng có nút
📋 "Tải danh sách tên file" xuất sẵn đúng danh sách đó. File nào không khớp tên ô nào thì
script in ra chứ không im lặng bỏ qua.

`mk_voice.py` gọi lại script này ở bước cuối, nên hai đường không giẫm chân nhau: giọng máy
dựng ra bao nhiêu ô, cộng với file bạn tự thảy vào, tất cả cùng nằm trong một manifest.
"""
import json
import os
import re
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Thư mục tiếng. Đổi được bằng tham số dòng lệnh hoặc biến môi trường VOICE_DIR — test dựng
# một thư mục tạm rồi chạy script trên đó, không đụng vào thư mục thật trong repo.
OUT = (sys.argv[1] if len(sys.argv) > 1 else
       os.environ.get('VOICE_DIR') or os.path.join(ROOT, 'assets', 'voice'))
EXT = ('.wav', '.mp3', '.m4a', '.aac', '.ogg', '.opus', '.flac', '.webm')


def slot_keys():
    """Tên mọi ô tiếng, đọc thẳng SFX_EVENTS trong index.html — khỏi chép tay thành hai bản."""
    s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    i = s.index('const SFX_EVENTS=[')
    blk = s[i:s.index('\n];', i)]
    # chỉ bắt TÊN KHOÁ, đừng đòi luôn cái nhãn phía sau: nhãn nào có dấu nháy đơn trong câu
    # thì viết bằng nháy kép ("Last Son's Resolve…") và mẫu đòi ,' sẽ bỏ sót đúng ô đó.
    return re.findall(r"\['(\w+)'", blk)


def norm(name):
    """Bỏ dấu, hạ chữ thường, mọi thứ không phải chữ-số thành '_' — `Suz Think.MP3` -> `suz_think`."""
    t = unicodedata.normalize('NFD', name)
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn').replace('đ', 'd').replace('Đ', 'd')
    return re.sub(r'_+', '_', re.sub(r'[^a-z0-9]+', '_', t.lower())).strip('_')


def main():
    if not os.path.isdir(OUT):
        print('khong co thu muc', OUT)
        return 1
    keys = slot_keys()
    look = {norm(k): k for k in keys}
    cu = {}
    p = os.path.join(OUT, 'manifest.json')
    if os.path.exists(p):
        try:
            cu = json.load(open(p, encoding='utf-8')).get('slots', {})
        except Exception:
            cu = {}

    slots, la, hong = {}, [], []
    for f in sorted(os.listdir(OUT)):
        if not f.lower().endswith(EXT):
            continue
        key = look.get(norm(os.path.splitext(f)[0]))
        if not key:
            hong.append(f)
            continue
        # giữ lại phần mô tả cũ (số câu, độ dài đoạn) nếu vẫn đúng file đó
        old = cu.get(key) or {}
        slots[key] = dict(old, file=f) if old.get('file') == f else {'file': f}
        la.append('%-16s <- %s' % (key, f))

    man = {'note': 'Danh sach o tieng co san trong assets/voice. Dung tools/mk_manifest.py de ghi lai.',
           'slots': slots}
    json.dump(man, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n'.join(la) or '(khong co file tieng nao)')
    print('=> %d o vao manifest.json' % len(slots))
    if hong:
        print('KHONG DOAN RA TEN O (doi ten roi chay lai): ' + ', '.join(hong))
        print('   ten o hop le lay o nut "Tai danh sach ten file" trong xuong')
    return 0


if __name__ == '__main__':
    sys.exit(main())
