#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dựng sẵn cả bộ GIỌNG cho mấy ô 🎙 bằng espeak-ng, khỏi phải tự thu từng câu.

    sudo apt-get install -y espeak-ng      # máy chưa có thì cài một lần
    python3 tools/mk_voice.py              # ghi ra assets/voice/*.wav

Ba điều bắt buộc, đừng đổi:
1. **Lời thoại đọc thẳng từ `index.html`** (SUZ_DECISIONS, AYA_STAND, GN_SHOUT…), không
   chép tay sang đây — sửa câu trong game là chạy lại script này là khớp ngay.
2. **Hai ô đọc nối tiếp (`suz_decide`, `suz_wrong`) phải chia ĐÚNG từng đoạn
   `SUZ_BUBBLE*RT` giây**: game nhảy tới đoạn thứ n bằng phép nhân, câu nào đọc dài hơn
   đoạn là bị cắt ngang, ngắn hơn thì phải chèn im lặng cho đủ. Thứ tự câu phải y hệt
   thứ tự trong mảng, đúng luật ở mục 4 của CLAUDE.md.
3. **Câu nào dài quá khung thì đọc NHANH hơn chứ không cắt**: `fit()` tăng dần tốc đọc
   cho tới khi vừa khung, vì luật "tiếng không được sống lâu hơn hình đi kèm".
"""
import json, os, re, subprocess, sys, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'index.html')
OUT = os.path.join(ROOT, 'assets', 'voice')
TMP = '/tmp/mkvoice'
SR = 11025          # 22050 của espeak chia đôi: giọng máy nghe vẫn rõ mà file nhẹ một nửa

src = open(SRC, encoding='utf-8').read()

def num(name):
    m = re.search(r'\b' + name + r'\s*=\s*([0-9.]+)', src)
    if not m: sys.exit('không tìm thấy hằng ' + name)
    return float(m.group(1))

def txt(name):
    m = re.search(r"\b" + name + r"\s*=\s*'((?:[^'\\]|\\.)*)'", src)
    if not m: sys.exit('không tìm thấy câu thoại ' + name)
    return m.group(1).replace("\\'", "'")

def arr(name):
    m = re.search(r'\b' + name + r'\s*=\s*\[(.*?)\];', src, re.S)
    if not m: sys.exit('không tìm thấy mảng ' + name)
    return [s.replace("\\'", "'") for s in re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))]

RT = 1 / num('BASE_SPEED')
BUB = num('SUZ_BUBBLE') * RT                    # độ dài một đoạn của hai ô đọc nối tiếp
# Hằng khai bằng gs() thì số ghi trong code ĐÃ là giây người chơi, khỏi nhân RT nữa.
THINK = 1.5 + .9                                # SUZ_THINK_LIFE = decThink + gs(.9)

# giọng: mã espeak, cao độ, tốc đọc khởi điểm
SUZ = ('en-us+f2', 45, 175)
AYA = ('en-us+m3', 25, 165)
GIN = ('en-us+m5', 10, 150)
DOR = ('en-us+f4', 90, 175)

SLOTS = [
    ('suz_think',    SUZ, THINK,                    [txt('SUZ_ASK')],  False),
    ('suz_decide',   SUZ, BUB,                      arr('SUZ_DECISIONS'), True),
    ('suz_wrong',    SUZ, BUB,                      arr('SUZ_WRONG'),  True),
    ('aya_stand',    AYA, num('SUZ_BUBBLE') * 1.4 * RT, [txt('AYA_STAND')], False),
    ('aya_join',     AYA, num('AYA_JOIN_LIFE') * RT,    [txt('AYA_LAST')],  False),
    ('aya_bye',      AYA, num('AYA_BYE_LIFE') * RT,     [txt('AYA_BYE')],   False),
    ('ginyu_force',  GIN, num('GN_FORCE_LIFE') * RT,    [txt('GN_SHOUT')],  False),
    ('ginyu_change', GIN, num('GN_CHANGE_LIFE') * RT,   [txt('GN_CHANGE_LINE')], False),
    ('dora_hi',      DOR, num('DORA_HI_LIFE') * RT,     [txt('DORA_HI')],   False),
]

def say(line, voice, speed, path):
    v, pitch, _ = voice
    subprocess.run(['espeak-ng', '-v', v, '-p', str(pitch), '-s', str(speed),
                    '-a', '190', '-g', '3', '-w', path, line], check=True)
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate(), w.readframes(w.getnframes()), w.getframerate()

def fit(line, voice, limit):
    """Đọc cho vừa khung: chậm trước, dài quá thì đọc nhanh dần. Cắt ngang là hỏng luật."""
    speed = voice[2]
    for _ in range(6):
        dur, pcm, sr = say(line, voice, speed, os.path.join(TMP, 'x.wav'))
        if dur <= limit - .05 or speed >= 320:
            return pcm, sr, dur, speed
        speed = int(speed * min(1.6, max(1.08, dur / (limit - .05))))
    return pcm, sr, dur, speed

def down(pcm, sr):
    """22050 -> 11025: gộp trung bình từng cặp mẫu, khỏi cần bộ lọc cho giọng máy."""
    if sr == SR: return pcm
    n = sr // SR
    out = bytearray()
    for i in range(0, len(pcm) // 2 - n + 1, 2 * n):
        s = 0
        for k in range(n):
            v = int.from_bytes(pcm[i + 2 * k:i + 2 * k + 2], 'little', signed=True)
            s += v
        out += int(s / n).to_bytes(2, 'little', signed=True)
    return bytes(out)

os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
man = {'note': 'Bộ giọng máy dựng bằng espeak-ng qua tools/mk_voice.py', 'slots': {}}
for name, voice, limit, lines, seg in SLOTS:
    body, over = bytearray(), []
    for line in lines:
        pcm, sr, dur, speed = fit(line, voice, limit)
        pcm = down(pcm, sr)
        if seg:                                    # chèn im lặng cho đủ một đoạn tròn
            need = int(limit * SR) * 2
            pcm = pcm[:need] + b'\0' * max(0, need - len(pcm))
        if dur > limit: over.append(line)
        body += pcm
    p = os.path.join(OUT, name + '.wav')
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(body))
    man['slots'][name] = {'file': name + '.wav', 'lines': len(lines),
                          'seg': round(limit, 2) if seg else None,
                          'sec': round(len(body) / 2 / SR, 2)}
    print('%-13s %2d câu · %5.1fs · %5.0f KB%s' % (name, len(lines), len(body) / 2 / SR,
          len(body) / 1024, '  (CÓ CÂU TRÀN KHUNG: ' + str(len(over)) + ')' if over else ''))
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('xong ->', OUT)
