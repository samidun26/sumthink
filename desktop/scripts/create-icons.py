"""Generate the app and template menu-bar icons without external assets."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'assets'
root.mkdir(exist_ok=True)
size = 1024
image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
mask = Image.new('L', (size, size), 0)
ImageDraw.Draw(mask).rounded_rectangle((20, 20, 1004, 1004), radius=210, fill=255)
art = Image.new('RGBA', (size, size), '#849c94')
draw = ImageDraw.Draw(art)
for y in range(size):
    mix = y / size
    draw.line((0, y, size, y), fill=(int(132+mix*107), int(156+mix*39), int(148+mix*2), 255))
draw.ellipse((337, 210, 687, 560), fill='#ffe0a1')
draw.polygon([(0,670),(120,530),(260,600),(460,460),(670,620),(850,480),(1024,640),(1024,1024),(0,1024)], fill='#a39476')
draw.polygon([(0,750),(200,630),(400,750),(650,620),(860,770),(1024,690),(1024,1024),(0,1024)], fill='#667d58')
draw.polygon([(0,840),(230,755),(470,870),(770,740),(1024,840),(1024,1024),(0,1024)], fill='#2e503e')
# A subtle check connects focus to the task workflow.
draw.line([(422,400),(488,465),(609,325)], fill='#fff8e7', width=25, joint='curve')
image.paste(art, (0,0), mask)
image.save(root/'app.png')
image.save(root/'app.icns', format='ICNS')
tray = Image.new('RGBA',(64,64),(0,0,0,0))
td=ImageDraw.Draw(tray)
td.ellipse((15,15,49,49),outline='#000000',width=4)
td.line([(23,32),(30,39),(42,25)],fill='#000000',width=4)
tray.resize((32,32),Image.Resampling.LANCZOS).save(root/'trayTemplate.png')
print('Generated app.png, app.icns, trayTemplate.png')
