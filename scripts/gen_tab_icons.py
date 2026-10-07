#!/usr/bin/env python3
"""两个人的小世界 · tabBar 图标生成器（确定性矢量绘制，无 imagegen 依赖）

按原型 SYMBOLS（weixinapp/shared/js/app.js）的几何语言重参数化 4 个线性图标：
房屋 / 碗 / 日记本 / 日历，24 viewBox 映射到 53px 内容框（81px 画布，65% 主体），
4× 超采样抗锯齿，输出普通态(#75675c)与选中态(#ee9a83)双态 PNG。

用法：
  python scripts/gen_tab_icons.py            # 生成 miniprogram/assets/tab/*.png
  python scripts/gen_tab_icons.py --check    # 校验已生成的 PNG
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SIZE = 81          # 输出画布（px）
CONTENT = 53       # 主体内容框（px，占画布 65%）
PAD = (SIZE - CONTENT) / 2
SS = 4             # 超采样倍率
INACTIVE = "#75675c"   # 普通态（--muted）
ACTIVE = "#ee9a83"     # 选中态（--accent）

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "miniprogram" / "assets" / "tab"

TAB_ITEMS = [
    ("home", "首页"),
    ("eat", "好好吃饭"),
    ("daily", "日常"),
    ("plan", "计划"),
]


def s(v: float) -> float:
    """24 坐标 → 超采样画布坐标"""
    return SS * (PAD + v / 24.0 * CONTENT)


def heart_pts(cx: float, cy: float) -> list[tuple[float, float]]:
    """心形填充多边形（原型 ic-heart-fill 简化重参数化）"""
    return [
        (cx, cy + 1.9),
        (cx - 2.4, cy - 0.7),
        (cx - 2.4, cy - 2.6),
        (cx - 0.8, cy - 3.5),
        (cx, cy - 2.4),
        (cx + 0.8, cy - 3.5),
        (cx + 2.4, cy - 2.6),
        (cx + 2.4, cy - 0.7),
    ]


# 每个 glyph 的描边路径（24 坐标折线）
GLYPHS: dict[str, list[list[tuple[float, float]]]] = {
    "home": [
        [(4, 11.6), (12, 4.8), (20, 11.6)],                      # 屋顶
        [(6, 10.4), (6, 18.6), (7.5, 20.1), (16.5, 20.1), (18, 18.6), (18, 10.4)],  # 屋身
        [(10, 20.1), (10, 14.6), (14, 14.6), (14, 20.1)],        # 门
    ],
    "eat": [
        [(4.5, 11.5), (19.5, 11.5)],                              # 碗口
        [(9, 4.2), (9.4, 5.15), (9, 6.1)],                        # 热气 ×3
        [(12, 4.2), (12.4, 5.15), (12, 6.1)],
        [(15, 4.2), (15.4, 5.15), (15, 6.1)],
    ],
    "daily": [
        [(9, 4.5), (9, 19.5)],                                    # 书脊
    ],
    "plan": [
        [(4, 10), (20, 10)],                                      # 日历头线
        [(8.5, 3.8), (8.5, 6.8)],                                 # 挂环
        [(15.5, 3.8), (15.5, 6.8)],
    ],
}


def draw_glyph(draw, name: str, color: str) -> None:
    from PIL import ImageDraw

    W = SS * 4  # 4px 线宽（原型 1.7/24 ≈ 7%）
    R = W / 2

    def polyline(pts):
        scaled = [(s(x), s(y)) for x, y in pts]
        # 线段 + 端点圆（模拟 round cap/join，Pillow 无原生圆头描边）
        for (x1, y1), (x2, y2) in zip(scaled, scaled[1:]):
            draw.line([(x1, y1), (x2, y2)], fill=color, width=W)
        for x, y in scaled:
            draw.ellipse([x - R, y - R, x + R, y + R], fill=color)

    for path in GLYPHS[name]:
        polyline(path)

    if name == "eat":
        # 碗底弧：3 点钟 → 6 点钟 → 9 点钟（顺时针下半圆）
        draw.arc(
            [s(4.5), s(11.5), s(19.5), s(19.5)],
            start=0, end=180, fill=color, width=W,
        )
        for x in (4.5, 19.5):
            xx, yy = s(x), s(11.5)
            draw.ellipse([xx - R, yy - R, xx + R, yy + R], fill=color)
    elif name == "daily":
        # 圆角书册外框 + 心形
        draw.rounded_rectangle(
            [s(5), s(4.5), s(19), s(19.5)],
            radius=s(1.5) - s(0),
            outline=color, width=W,
        )
        draw.polygon([(s(x), s(y)) for x, y in heart_pts(12, 16.4)], fill=color)
    elif name == "plan":
        # 圆角日历外框 + 心形
        draw.rounded_rectangle(
            [s(4), s(5.5), s(20), s(20)],
            radius=s(2.5) - s(0),
            outline=color, width=W,
        )
        draw.polygon([(s(x), s(y)) for x, y in heart_pts(12, 15.6)], fill=color)
    elif name == "home":
        pass  # 全部由折线构成
    else:
        raise ValueError(f"未知图标：{name}")


def render(name: str, color: str) -> object:
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", (SIZE * SS, SIZE * SS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_glyph(draw, name, color)
    return img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def generate() -> None:
    from PIL import Image

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, _label in TAB_ITEMS:
        for color, suffix in ((INACTIVE, ""), (ACTIVE, "-active")):
            png = OUT_DIR / f"{name}{suffix}.png"
            render(name, color).save(png, "PNG", optimize=True)
            print(png)
    print("已生成 8 张 tabBar 图标")


def check() -> int:
    from PIL import Image

    errors = []
    for name, _label in TAB_ITEMS:
        for suffix in ("", "-active"):
            png = OUT_DIR / f"{name}{suffix}.png"
            if not png.exists():
                errors.append(f"缺失：{png}")
                continue
            if png.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
                errors.append(f"非 PNG：{png}")
                continue
            img = Image.open(png)
            if img.size != (SIZE, SIZE):
                errors.append(f"尺寸异常 {img.size}：{png}")
                continue
            if img.mode != "RGBA":
                errors.append(f"非 RGBA：{png}")
                continue
            a = img.getchannel("A")
            for x, y in ((0, 0), (SIZE - 1, 0), (0, SIZE - 1), (SIZE - 1, SIZE - 1)):
                if a.getpixel((x, y)) != 0:
                    errors.append(f"角落不透明 ({x},{y})：{png}")
            bbox = a.getbbox()
            if bbox is None:
                errors.append(f"全透明：{png}")
            elif bbox[0] < 5 or bbox[1] < 5 or bbox[2] > SIZE - 5 or bbox[3] > SIZE - 5:
                errors.append(f"主体越界 bbox={bbox}：{png}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"校验通过：{len(TAB_ITEMS) * 2} 张图标均为 {SIZE}×{SIZE} 透明 PNG")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="仅校验已生成的 PNG")
    args = parser.parse_args()

    try:
        from PIL import Image, ImageDraw  # noqa: F401
    except ModuleNotFoundError:
        print("缺少依赖：Pillow。请先执行 python -m pip install pillow", file=sys.stderr)
        return 2

    if args.check:
        return check()
    generate()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
