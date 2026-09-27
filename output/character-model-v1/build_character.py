"""Build the approved green/gold companion as a real, editable Blender mesh.

Run: Blender --background --python build_character.py -- --preview
This is an explicitly procedural first model, not an image-to-mesh reconstruction.
Coordinates: Z up, -Y forward. All character pieces are real volumetric geometry.
"""
import bpy
import math
import json
import sys
import struct
from pathlib import Path
from mathutils import Vector
from mathutils import Matrix

OUT = Path(__file__).resolve().parent
PREVIEW = '--preview' in sys.argv
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes):
    for item in list(datablocks):
        if item.users == 0:
            datablocks.remove(item)

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32 if PREVIEW else 96
scene.cycles.use_denoising = True
scene.render.resolution_x = 1000 if PREVIEW else 1600
scene.render.resolution_y = 1100 if PREVIEW else 1760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = .5
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 73

character = bpy.data.collections.new('COMPANION | editable model')
scene.collection.children.link(character)
studio = bpy.data.collections.new('STUDIO | excluded from GLB')
scene.collection.children.link(studio)

def move_collection(obj, collection):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)

def material(name, color, rough=.4, metal=0, subsurface=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Subsurface Weight'].default_value = subsurface
    return mat

skin = material('Skin | warm porcelain', (.79,.515,.30), .4, 0, .065)
ear_inner = material('Ear warmth', (.67,.32,.20), .52)
blush = material('Cheek peach', (.83,.35,.245), .52, 0, .025)
hair = material('Hair | ink charcoal', (.014,.021,.022), .43)
hair_alt = material('Hair | slate highlight', (.023,.034,.032), .45)
teal = material('Teal enamel accents', (.035,.31,.29), .32, .23)
dark_teal = material('Deep teal hair strands', (.02,.102,.103), .36)
green = material('Trousers | forest green', (.025,.13,.092), .52)
cape_mat = material('Cape | jade textile', (.04,.23,.18), .55)
cape_inner = material('Cape | deep lining', (.018,.07,.055), .52)
shirt = material('Tunic | warm midnight', (.038,.037,.028), .58)
leather = material('Boots and gloves | dark leather', (.035,.043,.031), .42)
sole = material('Boot soles', (.018,.022,.017), .64)
gold = material('Antique gold', (.66,.37,.08), .28, .68)
gold_light = material('Gold highlights', (.85,.58,.18), .27, .58)
ivory = material('Ivory sash', (.84,.755,.52), .54)
white = material('Eye whites | warm', (.97,.94,.82), .22)
iris_ring = material('Iris outline', (.058,.09,.041), .28)
iris_green = material('Iris | jade', (.25,.45,.105), .24)
iris_amber = material('Iris | honey', (.68,.41,.06), .28, .05)
pupil = material('Pupil and lashes', (.010,.013,.010), .24)
shine = material('Eye catchlights', (1,1,.96), .09)
mouth_mat = material('Mouth cavity', (.13,.028,.018), .6)
tongue_mat = material('Tongue', (.81,.30,.22), .49)

parts = []
def finish(obj, name, mat, parent=None):
    obj.name = name
    move_collection(obj, character)
    if mat:
        obj.data.materials.append(mat)
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = True
    if parent:
        obj.parent = parent
    parts.append(obj)
    return obj

def empty(name, loc=(0,0,0), parent=None):
    obj = bpy.data.objects.new(name, None)
    character.objects.link(obj)
    obj.location = loc
    obj.parent = parent
    bpy.context.view_layer.update()
    return obj

root = empty('Companion_Root')
body_group = empty('Body', parent=root)
head_group = empty('Head | nod pivot', (0,0,2.66), body_group)

def uv(name, loc, scale, mat, parent=body_group, seg=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, mat)
    if parent:
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return obj

def mesh(name, vertices, faces, mat, parent=body_group, smooth=True):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    character.objects.link(obj)
    if mat:
        data.materials.append(mat)
    for face in data.polygons:
        face.use_smooth = smooth
    parts.append(obj)
    if parent:
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return obj

def tube(name, coords, radii, mat, depth=.65, parent=body_group, steps=6, sides=10):
    """Rounded Catmull-Rom tapered sweep; useful for sculpted hair and piping."""
    pts = [Vector(p) for p in coords]
    samples, widths = [], []
    for i in range(len(pts)-1):
        p0, p1 = pts[max(i-1,0)], pts[i]
        p2, p3 = pts[i+1], pts[min(i+2,len(pts)-1)]
        for j in range(steps):
            t=j/steps
            p=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
            samples.append(p)
            widths.append(radii[i]*(1-t)+radii[i+1]*t)
    samples.append(pts[-1]); widths.append(radii[-1])
    vertices=[]
    for i, p in enumerate(samples):
        tangent=(samples[min(i+1,len(samples)-1)]-samples[max(i-1,0)]).normalized()
        ref=Vector((0,1,0))
        if abs(tangent.dot(ref))>.94:
            ref=Vector((1,0,0))
        a=tangent.cross(ref).normalized()
        b=tangent.cross(a).normalized()
        for j in range(sides):
            angle=2*math.pi*j/sides
            vertices.append(p+a*math.cos(angle)*widths[i]+b*math.sin(angle)*widths[i]*depth)
    faces=[]
    for i in range(len(samples)-1):
        for j in range(sides):
            nj=(j+1)%sides
            faces.append((i*sides+j,i*sides+nj,(i+1)*sides+nj,(i+1)*sides+j))
    faces += [tuple(reversed(range(sides))), tuple((len(samples)-1)*sides+j for j in range(sides))]
    return mesh(name, vertices, faces, mat, parent)

def line(name, points, radius, mat, parent=body_group):
    return tube(name, points, [radius]*len(points), mat, 1, parent, steps=4, sides=8)

def link(name, start, end, radius, mat, parent=body_group, ratio=1):
    a,b=Vector(start),Vector(end)
    obj=uv(name,(a+b)/2,(radius,radius*ratio,(b-a).length/2+radius*.25),mat,parent)
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return obj

def ellipse_ring(name, center, rx, ry, radius, mat, parent=body_group):
    x,y,z=center
    coords=[(x+rx*math.cos(t*math.tau/48),y+ry*math.sin(t*math.tau/48),z) for t in range(49)]
    return line(name,coords,radius,mat,parent)

def diamond(name, center, width, height, mat=gold, parent=body_group, outline=True):
    x,y,z=center
    coords=[(x,y,z+height/2),(x+width/2,y,z),(x,y,z-height/2),(x-width/2,y,z),(x,y,z+height/2)]
    if outline:
        return line(name,coords,.017,mat,parent)
    return mesh(name,[Vector(p) for p in coords[:4]]+[(x,y-.035,z)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],mat,parent)

# Chibi body: short limbs, rounded boots and soft clothing volumes.
uv('Torso tunic',(0,.035,1.45),(.405,.275,.49),shirt)
uv('Hip trousers',(0,.04,1.035),(.39,.27,.26),green)
uv('Neck',(0,.015,1.97),(.16,.155,.20),skin)
ellipse_ring('Gold collar piping',(0,.005,1.91),.23,.2,.026,gold)
ellipse_ring('Collar dark band',(0,.005,1.945),.205,.18,.048,shirt)

for s in (-1,1):
    x=s*.22
    uv(f'Trouser leg {s}',(x,.055,.84),(.225,.23,.33),green)
    uv(f'Boot cuff {s}',(x,.035,.49),(.177,.18,.15),leather)
    ellipse_ring(f'Boot gold cuff {s}',(x,.035,.56),.167,.172,.025,gold)
    uv(f'Boot body {s}',(x,-.01,.30),(.16,.195,.235),leather)
    uv(f'Round boot toe {s}',(x,-.135,.18),(.18,.285,.13),leather)
    uv(f'Boot sole {s}',(x,-.12,.095),(.185,.292,.064),sole)
    line(f'Toe cap stitch {s}',[(x-.14,-.28,.23),(x,-.36,.255),(x+.14,-.28,.23)],.011,gold)
    diamond(f'Boot clasp {s}',(x,-.202,.375),.11,.105)
    diamond(f'Trousers embroidery {s}',(x,-.177,.825),.12,.18)
    tube(f'Trouser crease outer {s}',[(x+s*.12,-.13,.98),(x+s*.11,-.157,.81),(x+s*.08,-.12,.66)],[.016,.019,.006],cape_mat)

# Sash is a real flattened ribbon around waist, with asymmetric trailing ends.
def sash():
    verts=[]; n=64
    for j in range(3):
        for i in range(n):
            a=i*math.tau/n
            z=1.17+(j-1)*.075+.045*math.cos(a)
            verts.append((.394*math.cos(a),.033+.276*math.sin(a),z))
    faces=[]
    for j in range(2):
        for i in range(n):
            faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    obj=mesh('Wrapped ivory sash',verts,faces,ivory)
    mod=obj.modifiers.new('Sash thickness','SOLIDIFY'); mod.thickness=.028
    mod=obj.modifiers.new('Sash softened edge','BEVEL'); mod.width=.014; mod.segments=2
sash()
uv('Sash knot',(.10,-.263,1.18),(.105,.066,.07),ivory)
tube('Sash folded tail left',[(.10,-.275,1.16),(-.035,-.31,1.01),(-.15,-.30,.97)],[.074,.062,.019],ivory,.25)
tube('Sash folded tail right',[(.15,-.26,1.15),(.24,-.29,1.03),(.29,-.245,.92)],[.065,.065,.025],ivory,.28)
diamond('Sash central gold clip',(.115,-.337,1.19),.075,.095,gold_light)

# Chest trims and small gold pendants.
line('Collar V trim',[(-.16,-.154,1.89),(-.1,-.235,1.79),(0,-.262,1.75),(.1,-.235,1.79),(.16,-.154,1.89)],.022,gold)
for x,z in [(-.125,1.79),(.10,1.79),(0,1.64)]:
    diamond('Chest gold lozenge',(x,-.273,z),.105,.14)
line('Tunic hem left',[(-.28,-.17,1.62),(-.32,-.15,1.37),(-.23,-.229,1.27)],.014,gold)
line('Tunic hem right',[(.28,-.17,1.62),(.32,-.15,1.37),(.23,-.229,1.27)],.014,gold)

# Arms with distinct volumes and individually modeled mitten-like fingers.
def make_hand(name, wrist, palm, fingers, thumb, parent):
    link(name+' wrist',wrist,palm,.087,leather,parent)
    obj=uv(name+' palm',palm,(.115,.063,.122),leather,parent)
    for k,(a,b,c) in enumerate(fingers):
        tube(name+f' finger {k}',[a,b,c],[.032,.031,.018],leather,.85,parent)
    tube(name+' thumb',thumb,[.045,.042,.022],leather,.85,parent)
    diamond(name+' glove seal',(palm[0],palm[1]-.066,palm[2]),.073,.075,gold,parent)

wave_pivot=empty('Arm.L | wave pivot',(-.355,.015,1.78),body_group)
link('Raised bare upper arm',(-.34,.025,1.78),(-.57,-.005,1.58),.133,skin,wave_pivot)
link('Raised forearm',(-.57,-.005,1.61),(-.75,-.08,1.83),.116,skin,wave_pivot)
link('Left sleeve band',(-.37,.025,1.755),(-.43,.015,1.70),.144,shirt,wave_pivot)
link('Left gold bracer',(-.681,-.05,1.75),(-.725,-.068,1.80),.119,gold,wave_pivot)
make_hand('Greeting hand',(-.75,-.08,1.83),(-.825,-.10,1.985),[
    ((-.902,-.10,2.032),(-1.01,-.10,2.10),(-1.036,-.10,2.13)),
    ((-.871,-.10,2.075),(-.93,-.10,2.195),(-.93,-.10,2.23)),
    ((-.829,-.10,2.093),(-.84,-.10,2.225),(-.826,-.10,2.25)),
    ((-.785,-.10,2.081),(-.759,-.10,2.18),(-.737,-.10,2.195)),
], [(-.748,-.11,1.99),(-.668,-.13,2.037),(-.663,-.13,2.085)],wave_pivot)

right_pivot=empty('Arm.R',(.355,.015,1.78),body_group)
link('Resting upper arm',(.345,.02,1.78),(.55,-.008,1.55),.135,skin,right_pivot)
link('Resting forearm',(.55,-.008,1.55),(.64,-.095,1.30),.117,skin,right_pivot)
link('Right sleeve band',(.365,.02,1.755),(.425,.012,1.688),.145,shirt,right_pivot)
link('Right gold bracer',(.60,-.065,1.39),(.622,-.085,1.335),.12,gold,right_pivot)
uv('Resting hand',(.665,-.109,1.22),(.115,.075,.145),leather,right_pivot)
for i in range(4):
    uv('Relaxed finger '+str(i),(.595+i*.043,-.135,1.14+abs(i-1.5)*.012),(.026,.051,.063),leather,right_pivot,20,12)
uv('Relaxed thumb',(.575,-.142,1.25),(.045,.05,.068),leather,right_pivot)
diamond('Resting glove seal',(.667,-.183,1.245),.082,.1,gold,right_pivot)

# Floating asymmetric cape: folded mesh with a real reverse side and gold edge.
cape_pivot=empty('Cape | sway pivot',(.17,.23,1.85),body_group)
cape_rows=[
    [(-.1,.20,1.90),(.21,.29,1.87),(.49,.27,1.76)],
    [(-.16,.32,1.61),(.37,.43,1.64),(.79,.24,1.53)],
    [(-.20,.36,1.25),(.52,.48,1.38),(1.01,.18,1.31)],
    [(-.16,.32,.91),(.54,.48,1.10),(1.12,.16,1.08)],
    [(-.10,.31,.77),(.53,.45,.91),(.97,.15,1.02)],
]
cape=mesh('Sculpted asymmetrical cape',[p for row in cape_rows for p in row],[(i*3+j,i*3+j+1,(i+1)*3+j+1,(i+1)*3+j) for i in range(4) for j in range(2)],cape_mat,cape_pivot)
cape.data.materials.append(cape_inner)
sub=cape.modifiers.new('Soft fabric subdivision','SUBSURF'); sub.levels=2
solid=cape.modifiers.new('Cape lining thickness','SOLIDIFY'); solid.thickness=.024; solid.material_offset=1
line('Cape outer gold piping',[row[-1] for row in cape_rows],.023,gold,cape_pivot)
line('Cape lower gold piping',cape_rows[-1],.023,gold,cape_pivot)
line('Cape fold',[row[1] for row in cape_rows],.012,cape_inner,cape_pivot)
for center,sz in [((.87,.146,1.34),.10),((.65,.33,1.09),.08),((.30,.34,.93),.07)]:
    diamond('Cape decorative lozenge',center,sz,sz*1.5,gold,cape_pivot)
uv('Shoulder cape clasp',(.34,-.122,1.825),(.10,.06,.093),gold)
uv('Clasp jade inlay',(.34,-.181,1.825),(.055,.021,.055),teal)

# Head, ears and expression. Eyes are curved layered geometry, not flat decals.
uv('Rounded porcelain head',(0,-.025,2.70),(.785,.595,.735),skin,head_group,64,40)
for s in (-1,1):
    uv(f'Ear {s}',(s*.756,.008,2.57),(.13,.105,.18),skin,head_group)
    uv(f'Ear inner {s}',(s*.802,-.074,2.574),(.061,.028,.104),ear_inner,head_group)
    uv(f'Gold ear stud {s}',(s*.783,-.056,2.455),(.03,.025,.029),gold,head_group)
    if s==-1:
        line('Dangling earring chain',[(-.79,-.04,2.425),(-.80,-.04,2.31)],.013,gold,head_group)
        tube('Jade earring drop',[(-.80,-.04,2.325),(-.80,-.04,2.225),(-.80,-.04,2.18)],[.028,.047,.006],teal,.6,head_group)

for s in (-1,1):
    x=s*.295
    eye_start=len(parts)
    uv(f'Eye soft rim {s}',(x,-.572,2.685),(.233,.034,.269),skin,head_group,48,28)
    uv(f'Eye white {s}',(x,-.594,2.674),(.212,.025,.246),white,head_group,48,28)
    uv(f'Iris limbal ring {s}',(x+s*.012,-.616,2.675),(.171,.019,.227),iris_ring,head_group,48,28)
    uv(f'Iris green lens {s}',(x+s*.012,-.628,2.677),(.162,.016,.216),iris_green,head_group,48,28)
    uv(f'Lower honey iris {s}',(x+s*.012,-.643,2.577),(.125,.006,.084),iris_amber,head_group,32,20)
    uv(f'Large pupil {s}',(x+s*.011,-.648,2.712),(.10,.010,.146),pupil,head_group,40,24)
    uv(f'Primary eye highlight {s}',(x-.044,-.660,2.789),(.038,.009,.049),shine,head_group,24,16)
    uv(f'Second eye highlight {s}',(x+.047,-.657,2.602),(.017,.007,.021),shine,head_group,20,12)
    line(f'Upper eyelid {s}',[(x-.201,-.581,2.787),(x-.15,-.605,2.885),(x,-.615,2.93),(x+.153,-.603,2.869),(x+.201,-.58,2.787)],.020,pupil,head_group)
    eye_center=Vector((x,-.585,2.685))
    conform=Matrix.Translation(eye_center) @ Matrix.Rotation(s*.24,4,'Z') @ Matrix.Translation(-eye_center)
    for obj in parts[eye_start:]:
        obj.matrix_world=conform @ obj.matrix_world
    line(f'Expressive brow {s}',[(x-.13,-.535,3.035),(x,-.555,3.075),(x+.12,-.524,3.035)],.027,hair,head_group)
    # Small warm cheek ovals, restrained rather than sticker-like red circles.
    uv(f'Cheek blush {s}',(s*.47,-.509,2.435),(.085,.012,.032),blush,head_group)

# Tiny nose and smiling open mouth with a curved outline.
uv('Button nose',(0,-.625,2.466),(.066,.066,.055),skin,head_group)
mouth_coords=[(-.139,-.567,2.331),(-.084,-.589,2.32),(0,-.599,2.323),(.084,-.589,2.32),(.139,-.567,2.331),(.105,-.585,2.24),(0,-.607,2.202),(-.105,-.585,2.24)]
mouth=mesh('Open smiling mouth',mouth_coords,[(0,1,2,3,4,5,6,7)],mouth_mat,head_group)
solid=mouth.modifiers.new('Mouth recessed form','SOLIDIFY');solid.thickness=.025
bevel=mouth.modifiers.new('Soft smile edges','BEVEL');bevel.width=.018;bevel.segments=3
uv('Tongue in smile',(0,-.612,2.234),(.073,.012,.022),tongue_mat,head_group)
line('Smile upper teeth',[(-.077,-.603,2.315),(0,-.612,2.312),(.077,-.603,2.315)],.017,white,head_group)

# Hair cap has a variable hairline: above forehead in front, lower at the back.
verts=[]; faces=[]; nphi=64; ntheta=18
for i in range(ntheta+1):
    for j in range(nphi):
        phi=j*math.tau/nphi
        front=(1-math.cos(phi))/2
        cutoff=2.23-1.16*(front**2.1)
        theta=.001+(cutoff-.001)*i/ntheta
        verts.append((.852*math.sin(theta)*math.sin(phi),.025+.648*math.sin(theta)*math.cos(phi),2.79+.814*math.cos(theta)))
for i in range(ntheta):
    for j in range(nphi):
        faces.append((i*nphi+j,i*nphi+(j+1)%nphi,(i+1)*nphi+(j+1)%nphi,(i+1)*nphi+j))
cap=mesh('Hair scalp | shaped hairline',verts,faces,hair,head_group)
solid=cap.modifiers.new('Scalp closed thickness','SOLIDIFY');solid.thickness=.055

# Back and side locks are separate sculpted curved clumps with tapered tips.
for i in range(13):
    phi=-1.75+i*3.5/12
    xx, yy=math.sin(phi),math.cos(phi)
    coords=[(.50*xx,.03+.43*yy,3.32),(.75*xx,.04+.61*yy,3.09),(.86*xx,.05+.63*yy,2.75),(.91*xx,.055+.59*yy,2.48),(.78*xx,.055+.62*yy,2.41)]
    tube(f'Back sculpted lock {i:02}',coords,[.11,.18,.19,.135,.008],hair if i%3 else hair_alt,.69,head_group,7,12)

bangs=[
    ([(-.04,-.20,3.55),(-.22,-.48,3.47),(-.42,-.64,3.24),(-.59,-.62,3.01),(-.48,-.67,2.97)],[.115,.205,.19,.11,.004]),
    ([(.27,-.19,3.53),(.21,-.49,3.45),(-.03,-.675,3.29),(-.28,-.725,3.15),(-.43,-.69,3.18)],[.115,.19,.18,.11,.004]),
    ([(.44,-.21,3.48),(.45,-.51,3.34),(.29,-.69,3.15),(.08,-.734,3.005),(-.015,-.73,3.04)],[.12,.17,.17,.085,.003]),
    ([(.60,-.23,3.37),(.65,-.47,3.21),(.61,-.62,3.02),(.48,-.644,2.94),(.43,-.61,2.98)],[.11,.17,.135,.06,.003]),
    ([(-.58,-.25,3.31),(-.72,-.46,3.11),(-.72,-.51,2.83),(-.66,-.50,2.61),(-.73,-.46,2.64)],[.14,.17,.135,.069,.003]),
    ([(.70,-.22,3.19),(.78,-.40,2.98),(.76,-.44,2.72),(.69,-.47,2.53),(.77,-.39,2.59)],[.11,.15,.145,.07,.003]),
    ([(-.60,-.05,3.44),(-.79,-.18,3.33),(-.91,-.21,3.09),(-.98,-.21,3.03)],[.10,.17,.12,.003]),
    ([(.38,.0,3.49),(.66,-.10,3.50),(.84,-.14,3.40),(.91,-.12,3.45)],[.09,.16,.09,.003]),
]
for i,(coords,widths) in enumerate(bangs):
    tube(f'Forehead swept lock {i+1:02}',coords,widths,hair if i%3 else hair_alt,.62,head_group,9,14)
tube('Teal fringe accent left',[(-.72,-.482,3.02),(-.762,-.55,2.83),(-.696,-.544,2.69)],[.028,.036,.003],dark_teal,.24,head_group)
tube('Teal fringe accent right',[(.76,-.44,2.99),(.80,-.49,2.85),(.735,-.493,2.68)],[.022,.032,.002],dark_teal,.25,head_group)
tube('Playful top curl',[(.18,.005,3.52),(.25,-.025,3.80),(.10,-.05,3.94),(-.07,-.08,3.89),(-.13,-.12,3.76),(-.055,-.16,3.72)],[.10,.09,.084,.067,.042,.004],hair,.88,head_group,9,14)
tube('Crown swoosh',[(-.43,-.1,3.40),(-.62,-.20,3.57),(-.71,-.20,3.68),(-.59,-.25,3.65)],[.16,.15,.07,.004],hair,.75,head_group)

# Recognizable gold hair ornament, inlaid forehead diamonds and tiny beads.
flower_center=Vector((.774,-.49,3.22))
for i in range(5):
    a=math.tau*i/5+.1
    d=Vector((math.sin(a),0,math.cos(a)))
    coords=[flower_center,flower_center+d*.105+Vector((0,-.013,0)),flower_center+d*.20+Vector((0,.015,0)),flower_center+d*.265+Vector((0,.04,0))]
    tube(f'Golden hair flower petal {i}',coords,[.033,.07,.05,.003],gold_light,.48,head_group,6,10)
uv('Hair flower jade heart',flower_center+Vector((0,-.049,0)),(.065,.032,.065),teal,head_group)
for x,y,z,sz in [(-.17,-.815,3.27,.07),(-.045,-.826,3.215,.09),(.092,-.795,3.16,.065)]:
    diamond('Teal forehead rhombus',(x,y,z),sz,sz*1.37,teal,head_group)
line('Hair hanging braid',[(.45,-.725,3.19),(.47,-.733,3.09),(.47,-.69,2.96)],.026,dark_teal,head_group)
for i in range(3):
    uv(f'Gold braid bead {i}',(.462,-.757+i*.013,3.14-i*.069),(.035,.032,.03),gold,head_group,20,12)

# Weld the scalp and overlapping hair clumps into one continuous sculpture.
# A voxel union removes exposed cut ends while preserving the broad swept ridges.
hair_names=('Hair scalp','Back sculpted lock','Forehead swept lock','Playful top curl','Crown swoosh')
hair_objects=[obj for obj in character.objects if obj.type=='MESH' and obj.name.startswith(hair_names)]
bpy.ops.object.select_all(action='DESELECT')
for obj in hair_objects:
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    for modifier in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
for obj in hair_objects:obj.select_set(True)
bpy.context.view_layer.objects.active=cap
bpy.ops.object.join()
hair_sculpt=bpy.context.object
hair_sculpt.name='Hair | unified rounded sculpture'
remesh=hair_sculpt.modifiers.new('Welded sculpt surface','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.022;remesh.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=hair_sculpt.modifiers.new('Polished sculpt','SMOOTH');smooth.factor=.8;smooth.iterations=4
bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate=hair_sculpt.modifiers.new('Realtime hair topology','DECIMATE');decimate.ratio=.42
bpy.ops.object.modifier_apply(modifier=decimate.name)
for face in hair_sculpt.data.polygons:face.use_smooth=True

# Object-transform animation is intentionally a lightweight first-stage rig.
# These groups remain named and editable and export as GLB animation channels.
def animate(obj, frames):
    for frame,location,rotation in frames:
        if location is not None:
            obj.location=location
            obj.keyframe_insert('location',frame=frame)
        if rotation is not None:
            obj.rotation_euler=rotation
            obj.keyframe_insert('rotation_euler',frame=frame)

head_base=head_group.location.copy()
animate(head_group,[(1,head_base,(0,0,-.035)),(19,head_base+Vector((0,0,.015)),(.025,0,.025)),(37,head_base,(0,0,-.035)),(55,head_base+Vector((0,0,.015)),(.025,0,.025)),(73,head_base,(0,0,-.035))])
animate(body_group,[(1,(0,0,0),None),(19,(0,0,.016),None),(37,(0,0,0),None),(55,(0,0,.016),None),(73,(0,0,0),None)])
animate(wave_pivot,[(1,None,(0,0,0)),(13,None,(0,.18,0)),(25,None,(0,-.09,0)),(37,None,(0,.16,0)),(49,None,(0,-.06,0)),(61,None,(0,.11,0)),(73,None,(0,0,0))])
animate(cape_pivot,[(1,None,(0,0,0)),(19,None,(.055,0,.035)),(37,None,(0,0,0)),(55,None,(-.03,0,-.025)),(73,None,(0,0,0))])
for obj in [head_group,body_group,wave_pivot,cape_pivot]:
    if obj.animation_data and obj.animation_data.action:
        obj.animation_data.action.name='Greeting_Loop__'+obj.name.split(' |')[0]
scene.frame_set(1)

# Studio environment is excluded from GLB. Ground and podium are only render props.
ground_mat=material('Studio | warm ivory',(.78,.78,.665),.82)
base_mat=material('Display plinth | pale jade',(.22,.37,.29),.47)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.18))
ground=bpy.context.object;ground.name='Studio floor';ground.data.materials.append(ground_mat);move_collection(ground,studio)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=1.30,depth=.17,location=(0,0,-.08))
plinth=bpy.context.object;plinth.name='Display plinth';plinth.data.materials.append(base_mat);move_collection(plinth,studio)
bev=plinth.modifiers.new('Rounded display rim','BEVEL');bev.width=.055;bev.segments=4
for p in plinth.data.polygons:p.use_smooth=True

world=bpy.data.worlds.new('Warm studio world') if not bpy.data.worlds else bpy.data.worlds[0]
scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.80,.86,.82,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.65
def light(name,position,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);studio.objects.link(obj);obj.location=position
    obj.rotation_euler=(Vector((0,0,2))-obj.location).to_track_quat('-Z','Y').to_euler()
light('Key softbox',(-3.5,-4.5,7),420,4.0,(1,.88,.72))
light('Soft fill',(4,-2.7,4.0),280,3.5,(.75,.89,1))
light('Hair rim',(2.0,3,5.8),560,3,(1,.91,.72))
light('Eye softbox',(-.5,-4,3.5),45,2,(1,1,.94))

cam_data=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',cam_data);studio.objects.link(cam);scene.camera=cam
cam_data.type='ORTHO';cam_data.ortho_scale=4.7
def camera_at(position):
    cam.location=position;cam.rotation_euler=(Vector((0,0,1.97))-cam.location).to_track_quat('-Z','Y').to_euler()
camera_at((4.0,-10,4.6))

# Persist native source, then export only the actual model hierarchy.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'companion-v1.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in character.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'companion-v1.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True,export_extras=True)

# All animated groups form one clip that a web viewer can play with one command.
glb_path=OUT/'companion-v1.glb'
glb_bytes=glb_path.read_bytes()
json_length,json_kind=struct.unpack_from('<II',glb_bytes,12)
gltf=json.loads(glb_bytes[20:20+json_length])
if len(gltf.get('animations',[]))>1:
    merged={'name':'Greeting_Loop','channels':[],'samplers':[]}
    for clip in gltf['animations']:
        offset=len(merged['samplers'])
        merged['samplers'].extend(clip['samplers'])
        for channel in clip['channels']:
            merged['channels'].append({**channel,'sampler':channel['sampler']+offset})
    gltf['animations']=[merged]
    json_bytes=json.dumps(gltf,separators=(',',':'),ensure_ascii=True).encode()
    json_bytes+=b' '*((-len(json_bytes))%4)
    remaining=glb_bytes[20+json_length:]
    glb_path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(json_bytes)+len(remaining))+struct.pack('<II',len(json_bytes),json_kind)+json_bytes+remaining)

depsgraph=bpy.context.evaluated_depsgraph_get()
mesh_count=0;verts_count=0;tri_count=0
for obj in character.objects:
    if obj.type=='MESH':
        ev=obj.evaluated_get(depsgraph);m=ev.to_mesh();m.calc_loop_triangles()
        mesh_count+=1;verts_count+=len(m.vertices);tri_count+=len(m.loop_triangles)
        ev.to_mesh_clear()
metadata={
    'name':'Green Gold Companion v1',
    'method':'Procedural mesh modeling in Blender; no image-to-3D service used',
    'reference':'Approved 3D-style character concept from this conversation',
    'stage':'First 3D model prototype; stylized approximation, not exact sculpt reproduction',
    'blender_version':bpy.app.version_string,
    'mesh_objects':mesh_count,'evaluated_vertices':verts_count,'evaluated_triangles':tri_count,
    'animation':'Greeting loop: object-transform head nod, light breathing, hand wave and cape sway. No skeletal skinning or blink blendshapes.',
    'frame_rate':24,'frame_start':1,'frame_end':73,
    'glb_export_excludes':['studio floor','plinth','lights','camera'],
    'runtime_integration':False,
}
(OUT/'model-info.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False))

views=[('render-hero.png',(4,-10,4.6))]
if not PREVIEW:
    views += [('render-front.png',(0,-10,3.85)),('render-back.png',(-4,10,4.6))]
for filename,position in views:
    camera_at(position)
    scene.render.filepath=str(OUT/filename)
    bpy.ops.render.render(write_still=True)
print('COMPANION_BUILD_COMPLETE '+json.dumps(metadata))
