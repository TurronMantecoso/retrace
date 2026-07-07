import { Gtk } from "ags/gtk4"
import { createEffect } from "ags"
import GLib from "gi://GLib"
import GObject from "gi://GObject"
import Graphene from "gi://Graphene"

class CrtClipper extends Gtk.Widget {
    static {
        GObject.registerClass(this)
    }

    _child: Gtk.Widget | null = null;
    _progress: number = 0;
    _scanlineHeight: number = 40;

    get child() { return this._child; }
    set child(c: Gtk.Widget | null) {
        if (this._child) this._child.unparent();
        this._child = c;
        if (this._child) this._child.set_parent(this);
    }

    get progress() { return this._progress; }
    set progress(p: number) {
        this._progress = p;
        this.queue_draw();
    }

    get scanlineHeight() { return this._scanlineHeight; }
    set scanlineHeight(h: number) {
        this._scanlineHeight = h;
    }

    vfunc_measure(orientation: Gtk.Orientation, for_size: number) {
        if (this._child) return this._child.measure(orientation, for_size);
        return [0, 0, -1, -1];
    }

    vfunc_size_allocate(width: number, height: number, baseline: number) {
        if (this._child) this._child.allocate(width, height, baseline, null);
    }

    vfunc_snapshot(snapshot: Gtk.Snapshot) {
        if (!this._child) return;
        let width = this.get_width();
        let height = this.get_height();

        if (this._progress >= 1) {
            this.snapshot_child(this._child, snapshot);
            return;
        }
        if (this._progress <= 0) {
            return; // Draw nothing, fully transparent
        }

        const scanlineHeight = this._scanlineHeight;
        const totalLines = Math.ceil(height / scanlineHeight);
        const currentLine = Math.floor(this._progress * totalLines);
        const currentX = (this._progress * totalLines - currentLine) * width;

        if (currentLine > 0) {
            let topRect = new Graphene.Rect();
            topRect.init(0, 0, width, currentLine * scanlineHeight);
            snapshot.push_clip(topRect);
            this.snapshot_child(this._child, snapshot);
            snapshot.pop();
        }

        if (currentX > 0) {
            let scanRect = new Graphene.Rect();
            scanRect.init(0, currentLine * scanlineHeight, currentX, scanlineHeight);
            snapshot.push_clip(scanRect);
            this.snapshot_child(this._child, snapshot);
            snapshot.pop();
        }
    }
}

export default function CrtMask({ openState, durationMs = 500, scanlineHeight = 40, children }: { openState: () => boolean, durationMs?: number, scanlineHeight?: number, children: any }) {
  let progress = 0;
  let animId: number | null = null;
  let clipper = new CrtClipper();
  clipper.scanlineHeight = scanlineHeight;
  
  // En JSX de AGS, children puede ser un solo widget o un array
  clipper.child = Array.isArray(children) ? children[0] : children;

  createEffect(() => {
    const open = openState();
    if (animId) { GLib.source_remove(animId); animId = null; }
    
    let start = GLib.get_monotonic_time();
    let duration = durationMs * 1000; // microsegundos
    let initialProgress = progress;

    if (open) {
      animId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
        let now = GLib.get_monotonic_time();
        let p = (now - start) / duration;
        if (p >= 1) { 
          progress = 1; 
          clipper.progress = 1;
          animId = null; 
          return GLib.SOURCE_REMOVE; 
        }
        progress = initialProgress + p * (1 - initialProgress);
        clipper.progress = progress;
        return GLib.SOURCE_CONTINUE;
      })
    } else {
      animId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, () => {
        let now = GLib.get_monotonic_time();
        let p = (now - start) / duration;
        if (p >= 1) { 
          progress = 0; 
          clipper.progress = 0;
          animId = null; 
          return GLib.SOURCE_REMOVE; 
        }
        progress = initialProgress - p * initialProgress;
        clipper.progress = progress;
        return GLib.SOURCE_CONTINUE;
      })
    }
  })

  return clipper;
}
