#!/usr/bin/env python3
"""Minimal CDP driver: run a list of steps against headless Chrome and save screenshots.

Usage:
  python3 tools/cdp_shot.py --url http://localhost:3000 --width 1440 --height 900 \
      --out shots --steps steps.json [--mobile]
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
import time

import requests
import websockets

CHROME = "/home/user/.local/share/choreographer/deps/chrome-linux64/chrome"
PORT = 9333


class CDP:
    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.ws = None
        self.next_id = 0

    async def __aenter__(self):
        self.ws = await websockets.connect(self.ws_url, max_size=64 * 1024 * 1024, open_timeout=20)
        return self

    async def __aexit__(self, *exc):
        await self.ws.close()

    async def send(self, method, **params):
        self.next_id += 1
        mid = self.next_id
        await self.ws.send(json.dumps({"id": mid, "method": method, "params": params}))
        while True:
            msg = json.loads(await self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})


async def evaluate(cdp, expr):
    res = await cdp.send(
        "Runtime.evaluate",
        expression=expr,
        returnByValue=True,
        awaitPromise=True,
    )
    if res.get("exceptionDetails"):
        raise RuntimeError(json.dumps(res["exceptionDetails"])[:400])
    return res.get("result", {}).get("value")


async def center_of(cdp, selector):
    js = (
        "(() => { const el = document.querySelector(%s);"
        " if (!el) return null;"
        " const r = el.getBoundingClientRect();"
        " return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 });"
        " })()"
    ) % json.dumps(selector)
    raw = await evaluate(cdp, js)
    if not raw:
        raise RuntimeError("selector not found: " + selector)
    return json.loads(raw)


async def real_click(cdp, x, y, right=False):
    kind = "right" if right else "left"
    buttons = 2 if right else 1
    await cdp.send("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y)
    await cdp.send(
        "Input.dispatchMouseEvent", type="mousePressed", x=x, y=y, button=kind, buttons=buttons, clickCount=1
    )
    await asyncio.sleep(0.05)
    await cdp.send("Input.dispatchMouseEvent", type="mouseReleased", x=x, y=y, button=kind, buttons=0, clickCount=1)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--scale", type=float, default=2)
    ap.add_argument("--out", default="shots")
    ap.add_argument("--steps", default="")
    ap.add_argument("--mobile", action="store_true")
    ap.add_argument("--wait", type=float, default=2.5)
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    user_data = "/tmp/cdp-profile"
    proc = subprocess.Popen(
        [
            CHROME,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--hide-scrollbars",
            "--force-color-profile=srgb",
            "--text-antialiasing=none",
            f"--remote-debugging-port={PORT}",
            f"--user-data-dir={user_data}",
            f"--window-size={args.width},{args.height}",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    ws_url = None
    for _ in range(120):
        try:
            targets = requests.get(f"http://127.0.0.1:{PORT}/json", timeout=1).json()
            pages = [t for t in targets if t.get("type") == "page"]
            if pages:
                ws_url = pages[0]["webSocketDebuggerUrl"]
                break
        except Exception:
            pass
        time.sleep(0.25)
    if not ws_url:
        print("chrome did not come up", file=sys.stderr)
        proc.kill()
        sys.exit(1)

    steps = []
    if args.steps:
        steps = json.load(open(args.steps))
    else:
        steps = [{"shot": "01.png"}]

    async with CDP(ws_url) as cdp:
        await cdp.send("Page.enable")
        await cdp.send("Runtime.enable")
        await cdp.send(
            "Emulation.setDeviceMetricsOverride",
            width=args.width,
            height=args.height,
            deviceScaleFactor=args.scale,
            mobile=args.mobile,
        )
        if args.mobile:
            await cdp.send("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=1)
            await cdp.send(
                "Network.setUserAgentOverride",
                userAgent=(
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                ),
            )
        # Headless Chrome reports (hover: none), which would disable desktop-only
        # affordances such as drag-to-reorder. Emulate a real mouse so the
        # screenshots exercise the same code path a desktop user gets.
        features = [{"name": "prefers-reduced-motion", "value": "no-preference"}]
        if args.mobile:
            features += [{"name": "hover", "value": "none"}, {"name": "pointer", "value": "coarse"}]
        else:
            features += [{"name": "hover", "value": "hover"}, {"name": "pointer", "value": "fine"}]
        await cdp.send("Emulation.setEmulatedMedia", features=features)

        await cdp.send("Page.navigate", url=args.url)
        await asyncio.sleep(args.wait)

        n = 0
        for step in steps:
            if "goto" in step:
                await cdp.send("Page.navigate", url=step["goto"])
                await asyncio.sleep(step.get("wait", args.wait))
            if "js" in step:
                expr = step["js"]
                if not isinstance(expr, str):
                    expr = " ".join(expr)
                out = await evaluate(cdp, expr)
                if out is not None and step.get("print"):
                    print("JS:", json.dumps(out)[:400])
                await asyncio.sleep(step.get("wait", 0.35))
            if "click" in step:
                x, y = step["click"]
                for t in ("mousePressed", "mouseReleased"):
                    await cdp.send(
                        "Input.dispatchMouseEvent",
                        type=t,
                        x=x,
                        y=y,
                        button="left",
                        clickCount=1,
                        buttons=1 if t == "mousePressed" else 0,
                    )
                await asyncio.sleep(step.get("wait", 0.4))
            if "rightclick" in step:
                x, y = step["rightclick"]
                for t in ("mousePressed", "mouseReleased"):
                    await cdp.send(
                        "Input.dispatchMouseEvent",
                        type=t,
                        x=x,
                        y=y,
                        button="right",
                        clickCount=1,
                        buttons=2 if t == "mousePressed" else 0,
                    )
                await asyncio.sleep(step.get("wait", 0.4))
            if "move" in step:
                x, y = step["move"]
                await cdp.send("Input.dispatchMouseEvent", type="mouseMoved", x=x, y=y)
                await asyncio.sleep(step.get("wait", 0.25))
            if "drag" in step:
                fx, fy, tx, ty = step["drag"]
                await cdp.send("Input.dispatchMouseEvent", type="mousePressed", x=fx, y=fy, button="left", buttons=1, clickCount=1)
                await asyncio.sleep(0.08)
                for i in range(1, 13):
                    p = i / 12
                    await cdp.send(
                        "Input.dispatchMouseEvent",
                        type="mouseMoved",
                        x=fx + (tx - fx) * p,
                        y=fy + (ty - fy) * p,
                        button="left",
                        buttons=1,
                    )
                    await asyncio.sleep(0.035)
                if step.get("midshot"):
                    await asyncio.sleep(0.12)
                    await capture(cdp, os.path.join(args.out, step["midshot"]))
                await cdp.send("Input.dispatchMouseEvent", type="mouseReleased", x=tx, y=ty, button="left", buttons=0, clickCount=1)
                await asyncio.sleep(step.get("wait", 0.5))
            if "key" in step:
                k = step["key"]
                mods = step.get("modifiers", 0)
                text = k if len(k) == 1 else ""
                code = {"Escape": "Escape", "Enter": "Enter", "Tab": "Tab", "ArrowDown": "ArrowDown",
                        "ArrowUp": "ArrowUp", "ArrowRight": "ArrowRight", "ArrowLeft": "ArrowLeft",
                        "Backspace": "Backspace", "?": "Slash", "/": "Slash", " ": "Space",
                        "Delete": "Delete", "k": "KeyK", "n": "KeyN", "f": "KeyF", "e": "KeyE"}.get(k, "")
                vk = {"Escape": 27, "Enter": 13, "Tab": 9, "ArrowDown": 40, "ArrowUp": 38,
                      "ArrowRight": 39, "ArrowLeft": 37, "Backspace": 8, "?": 191, "/": 191,
                      " ": 32, "Delete": 46, "k": 75, "n": 78, "f": 70, "e": 69}.get(k, 0)
                await cdp.send("Input.dispatchKeyEvent", type="keyDown", key=k, code=code, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, modifiers=mods, text=text)
                if text:
                    await cdp.send("Input.dispatchKeyEvent", type="char", key=k, text=text, unmodifiedText=text)
                await cdp.send("Input.dispatchKeyEvent", type="keyUp", key=k, code=code, windowsVirtualKeyCode=vk, nativeVirtualKeyCode=vk, modifiers=mods)
                await asyncio.sleep(step.get("wait", 0.35))
            if "hoverSel" in step:
                c = await center_of(cdp, step["hoverSel"])
                await cdp.send("Input.dispatchMouseEvent", type="mouseMoved", x=c["x"], y=c["y"])
                await asyncio.sleep(step.get("wait", 0.3))
            if "clickSel" in step:
                c = await center_of(cdp, step["clickSel"])
                await real_click(cdp, c["x"], c["y"])
                await asyncio.sleep(step.get("wait", 0.45))
            if "rightSel" in step:
                c = await center_of(cdp, step["rightSel"])
                await real_click(cdp, c["x"], c["y"], right=True)
                await asyncio.sleep(step.get("wait", 0.4))
            if "dragSel" in step:
                a = await center_of(cdp, step["dragSel"]["from"])
                b = await center_of(cdp, step["dragSel"]["to"])
                await cdp.send(
                    "Input.dispatchMouseEvent", type="mouseMoved", x=a["x"], y=a["y"]
                )
                await asyncio.sleep(0.06)
                await cdp.send(
                    "Input.dispatchMouseEvent",
                    type="mousePressed",
                    x=a["x"],
                    y=a["y"],
                    button="left",
                    buttons=1,
                    clickCount=1,
                )
                await asyncio.sleep(0.06)
                for i in range(1, 15):
                    t = i / 14
                    ease = 1 - (1 - t) ** 3
                    await cdp.send(
                        "Input.dispatchMouseEvent",
                        type="mouseMoved",
                        x=a["x"] + (b["x"] - a["x"]) * ease,
                        y=a["y"] + (b["y"] - a["y"]) * ease,
                        button="left",
                        buttons=1,
                    )
                    await asyncio.sleep(0.03)
                if step.get("midshot"):
                    await capture(cdp, os.path.join(args.out, step["midshot"]))
                    print("wrote", step["midshot"], "(mid-drag)")
                await cdp.send(
                    "Input.dispatchMouseEvent",
                    type="mouseReleased",
                    x=b["x"],
                    y=b["y"],
                    button="left",
                    buttons=0,
                    clickCount=1,
                )
                await asyncio.sleep(step.get("wait", 0.6))
            if "scroll" in step:
                await evaluate(cdp, f"document.querySelector('[data-scroll-root]').scrollTo(0,{step['scroll']})")
                await asyncio.sleep(step.get("wait", 0.3))
            if "theme" in step:
                await evaluate(cdp, f"document.documentElement.setAttribute('data-theme','{step['theme']}')")
                await asyncio.sleep(step.get("wait", 0.25))
            if "shot" in step:
                n += 1
                name = step["shot"].format(n=n)
                await asyncio.sleep(0.1)
                await capture(cdp, os.path.join(args.out, name))
                print("wrote", name)

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()


async def capture(cdp, path):
    res = await cdp.send("Page.captureScreenshot", format="png", captureBeyondViewport=False)
    import base64

    open(path, "wb").write(base64.b64decode(res["data"]))


asyncio.run(main())
