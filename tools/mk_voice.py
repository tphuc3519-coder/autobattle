#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dựng sẵn cả bộ GIỌNG cho mấy ô 🎙, khỏi phải tự thu từng câu.

    sudo apt-get install -y espeak-ng mbrola mbrola-us1 mbrola-us2 mbrola-us3
    python3 tools/mk_voice.py              # ghi ra assets/voice/*.wav

**Giọng lấy từ MBROLA** (`mb-us1` nữ · `mb-us2` / `mb-us3` nam) — đó là giọng ghép từ
mẫu người thật thu sẵn, nghe ra người hơn hẳn giọng tổng hợp thuần của espeak. Máy nào
chưa cài MBROLA thì tự lùi về giọng espeak (`VOICES[...]['alt']`), vẫn chạy được nhưng
nghe ra máy móc.

Bốn điều bắt buộc, đừng đổi:
1. **Lời thoại đọc thẳng từ `index.html`** (SUZ_DECISIONS, AYA_STAND, GN_SHOUT…), không
   chép tay sang đây — sửa câu trong game là chạy lại script này là khớp ngay.
2. **Hai ô đọc nối tiếp (`suz_decide`, `suz_wrong`) phải chia ĐÚNG từng đoạn
   `SUZ_BUBBLE*RT` giây**: game nhảy tới đoạn thứ n bằng phép nhân, câu nào đọc dài hơn
   đoạn là bị cắt ngang, ngắn hơn thì phải chèn im lặng cho đủ. Thứ tự câu phải y hệt
   thứ tự trong mảng, đúng luật ở mục 4 của CLAUDE.md.
3. **Câu nào dài quá khung thì đọc NHANH hơn chứ không cắt**: `fit()` tăng dần tốc đọc
   cho tới khi vừa khung, vì luật "tiếng không được sống lâu hơn hình đi kèm".
4. **Cao độ chỉnh bằng `shift()` chứ không bằng cờ `-p`**: giọng MBROLA có timbre cố
   định, `-p` gần như không ăn thua (đo bằng số lần đổi dấu: 253 với p=50 và 244 với
   p=90). `shift()` đổi bước đọc mẫu nên kéo hẳn cao độ — Doraemon cao lên, Ginyu trầm
   xuống — và `fit()` bù lại phần thời lượng bị co giãn theo.
"""
import json, os, re, subprocess, sys, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'index.html')
OUT = os.path.join(ROOT, 'assets', 'voice')
TMP = '/tmp/mkvoice'
SR = 16000          # MBROLA vốn 16000; giọng lùi của espeak (22050) thì hạ xuống cho nhẹ file

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

# Giọng: (mã espeak-ng, giọng lùi khi máy chưa có MBROLA, tốc đọc khởi điểm, hệ số cao độ)
MB = subprocess.run(['which', 'mbrola'], capture_output=True).returncode == 0
WARN = 0
SUZ = ('mb-us1', 'en-us+f2', 168, 1.00)     # Horikita: nữ, đọc dứt khoát
AYA = ('mb-us2', 'en-us+m3', 158, 0.96)     # Ayanokouji: nam, trầm và phẳng
GIN = ('mb-en1', 'en-us+m5', 152, 0.86)     # Ginyu: giọng khác hẳn Ayanokouji, kéo trầm cho ra phản diện
DOR = ('mb-us1', 'en-us+f4', 150, 1.22)     # Doraemon: kéo cao lên cho ra giọng mèo máy

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
    v = voice[0] if MB else voice[1]
    r = subprocess.run(['espeak-ng', '-v', v, '-s', str(speed), '-a', '190', '-g', '3',
                        '-w', path, line], check=True, capture_output=True, text=True)
    # MBROLA thiếu diphone thì THAY BẰNG IM LẶNG chứ không báo lỗi — nuốt mất âm mà vẫn
    # chạy tiếp, nên phải đếm ra đây. Thấy con số này khác 0 thì đổi sang giọng khác.
    global WARN
    WARN += (r.stderr or '').count('unknown')
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate(), w.readframes(w.getnframes()), w.getframerate()

def shift(pcm, k):
    """Đổi cao độ bằng cách đổi bước đọc mẫu: k>1 cao lên, k<1 trầm xuống.
       Thời lượng co giãn theo 1/k — fit() đo lại sau khi shift nên vẫn lọt khung."""
    if abs(k - 1) < .01: return pcm
    n = len(pcm) // 2
    out = bytearray()
    i = 0.0
    while i < n - 1:
        j = int(i); fr = i - j
        a = int.from_bytes(pcm[2 * j:2 * j + 2], 'little', signed=True)
        b = int.from_bytes(pcm[2 * j + 2:2 * j + 4], 'little', signed=True)
        out += int(a + (b - a) * fr).to_bytes(2, 'little', signed=True)
        i += k
    return bytes(out)

def fit(line, voice, limit):
    """Đọc cho vừa khung: chậm trước, dài quá thì đọc nhanh dần. Cắt ngang là hỏng luật."""
    speed = voice[2]
    for _ in range(6):
        dur, pcm, sr = say(line, voice, speed, os.path.join(TMP, 'x.wav'))
        pcm = shift(pcm, voice[3])
        dur = len(pcm) / 2 / sr                       # shift co giãn cả thời lượng
        if dur <= limit - .05 or speed >= 320:
            return pcm, sr, dur, speed
        speed = int(speed * min(1.6, max(1.08, dur / (limit - .05))))
    return pcm, sr, dur, speed

def down(pcm, sr):
    """Chỉ hạ tần số khi nguồn cao hơn SR (espeak 22050); MBROLA vốn đã 16000 thì giữ nguyên."""
    if sr <= SR: return pcm, sr
    n = sr // SR
    out = bytearray()
    for i in range(0, len(pcm) // 2 - n + 1, 2 * n):
        s = 0
        for k in range(n):
            s += int.from_bytes(pcm[i + 2 * k:i + 2 * k + 2], 'little', signed=True)
        out += int(s / n).to_bytes(2, 'little', signed=True)
    return bytes(out), sr // n

os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
man = {'note': 'Bo giong dung bang MBROLA + espeak-ng qua tools/mk_voice.py', 'slots': {}}
for name, voice, limit, lines, seg in SLOTS:
    body, over, rate = bytearray(), [], SR
    for line in lines:
        pcm, sr, dur, speed = fit(line, voice, limit)
        pcm, rate = down(pcm, sr)
        if seg:                                    # chèn im lặng cho đủ một đoạn tròn
            need = int(limit * rate) * 2
            pcm = pcm[:need] + b'\0' * max(0, need - len(pcm))
        if dur > limit: over.append(line)
        body += pcm
    p = os.path.join(OUT, name + '.wav')
    with wave.open(p, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(bytes(body))
    man['slots'][name] = {'file': name + '.wav', 'lines': len(lines),
                          'seg': round(limit, 2) if seg else None,
                          'sec': round(len(body) / 2 / rate, 2)}
    print('%-13s %2d cau · %5.1fs · %5.0f KB%s' % (name, len(lines), len(body) / 2 / rate,
          len(body) / 1024, '  (CO CAU TRAN KHUNG: ' + str(len(over)) + ')' if over else ''))
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
# Quét lại cả thư mục: file người dùng tự thảy vào (mọi ô tiếng, không riêng chín ô giọng)
# phải còn nguyên trong manifest, không thì chạy script này là xoá mất danh sách của họ.
try:
    import subprocess
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                    'mk_manifest.py')], check=False)
except Exception as e:
    print('khong goi duoc mk_manifest.py:', e)
print('xong ->', OUT, '· giong', 'MBROLA' if MB else 'espeak (chua cai MBROLA)',
      ('· %d am bi nuot, doi giong khac!' % WARN) if WARN else '· khong am nao bi nuot')
