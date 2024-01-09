import json5

from OCC.Core.StlAPI import StlAPI_Reader
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.BRep import BRep_Builder
from OCC.Core.TopoDS import TopoDS_Shell, topods_Shell
from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_MakeSolid, BRepBuilderAPI_Sewing
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.TopoDS import TopoDS_Shape
from OCC.Extend.DataExchange import read_step_file, write_step_file

with open('params.json5', 'r') as f:
    params = json5.load(f)

nx = int(params['model']['width'] / params['model']['pixel_size'])
ny = int(params['model']['height'] / params['model']['pixel_size'])
dx = params['model']['pixel_size']

# Read the STL file
stl_reader = StlAPI_Reader()
shape = TopoDS_Shell()
builder = BRep_Builder()
stl_reader.Read(shape, f'heights_{nx}_{ny}.stl')

# Convert to TopoDS_Shell
shell = topods_Shell(shape)

# Sew the shell to make a solid
sewer = BRepBuilderAPI_Sewing()
sewer.Add(shell)
sewer.Perform()
sewn_shell = sewer.SewedShape()

# Convert sewn shell to a solid
maker = BRepBuilderAPI_MakeSolid()
maker.Add(topods_Shell(sewn_shell))
solid = maker.Solid()

# Now, 'solid' is your BRep model
# Create a STEP writer
step_writer = STEPControl_Writer()
step_writer.Transfer(shape, STEPControl_AsIs)

# Write to a file
status = step_writer.Write(f'heights_{nx}_{ny}.step')

if status == 1:
    print("File successfully written")
else:
    print("Error in writing file")