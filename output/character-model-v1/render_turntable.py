"""Render real geometry into a short 360-degree MP4 source sequence."""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

out=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(out/'companion-v1.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.render.resolution_x=720
scene.render.resolution_y=800
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
frames=out/'turntable-frames'
frames.mkdir(exist_ok=True)
scene.camera.data.ortho_scale=4.7
for i in range(72):
    angle=i/72*math.tau+.30
    scene.frame_set(i+1)
    scene.camera.location=(math.sin(angle)*10,-math.cos(angle)*10,4.0)
    scene.camera.rotation_euler=(Vector((0,0,1.97))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(frames/f'{i:03}.png')
    bpy.ops.render.render(write_still=True)
print('TURNTABLE_RENDER_COMPLETE')
