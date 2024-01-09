import sys
import os
import json5
import numpy
import matplotlib.pyplot as plt
# import rhino3dm as r3d
from tqdm import tqdm
import tifffile

from OCC.Core.TopoDS import TopoDS_Compound
from OCC.Core.BRep import BRep_Builder
from OCC.Core.BRepBuilderAPI import BRepBuilderAPI_MakeFace
from OCC.Core.GeomAPI import GeomAPI_PointsToBSplineSurface
from OCC.Core.TColgp import TColgp_Array2OfPnt
from OCC.Core.gp import gp_Pnt
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.Interface import Interface_Static

with open('params.json5', 'r') as f:
    params = json5.load(f)

nx = int(params['model']['width'] / params['model']['pixel_size'])
ny = int(params['model']['height'] / params['model']['pixel_size'])
dx = params['model']['pixel_size']
# Assume vertices and faces are defined
# vertices = [(x1, y1, z1), (x2, y2, z2), ...]
# faces = [(i1, i2, i3), (i4, i5, i6), ...] - indices in the vertices list

# Initialize a BRep compound
builder = BRep_Builder()
compound = TopoDS_Compound()
builder.MakeCompound(compound)

heights = tifffile.imread(f'heights_{nx}_{ny}.tif')

def make_BRep_OCC(heights):
    baseplate_height = 0

    # Assuming the elevation array is a 2D numpy array
    rows, cols = heights.shape
    points_array = TColgp_Array2OfPnt(1, rows, 1, cols)

    # Create the base plate at a certain depth below your model
    # base_plate = BRepPrimAPI_MakeBox(-baseplate_height, -baseplate_height, -baseplate_height, rows + 2 * baseplate_height, height + 2 * baseplate_height, baseplate_height).Shape()

    # # Create side walls based on the TIFF dimensions
    # wall_1 = BRepPrimAPI_MakeBox(0, 0, 0, width, baseplate_height, 50).Shape()  # Front wall
    # wall_2 = BRepPrimAPI_MakeBox(0, height - baseplate_height, 0, width, baseplate_height, 50).Shape()  # Back wall
    # wall_3 = BRepPrimAPI_MakeBox(0, 0, 0, baseplate_height, height, 50).Shape()  # Left wall
    # wall_4 = BRepPrimAPI_MakeBox(width - baseplate_height, 0, 0, baseplate_height, height, 50).Shape()  # Right wall

    # Create a grid of 3D points
    for i in tqdm(range(rows)):
        for j in tqdm(range(cols), leave=False):
            # Create a point with elevation data
            # Adjust x, y, z coordinates as per your data's spatial reference
            pnt = gp_Pnt(j, i, heights[i][j])
            points_array.SetValue(i + 1, j + 1, pnt)

    # Create a B-spline surface from these points
    bspline_surface = GeomAPI_PointsToBSplineSurface(points_array).Surface()

    # Make a face from this surface
    face = BRepBuilderAPI_MakeFace(bspline_surface, 1e-6).Face()

    # Now, 'face' contains your BRep model
    # You can proceed to export this as IGES or STEP
    # Create a STEP writer
    step_writer = STEPControl_Writer()
    Interface_Static.SetCVal("write.step.schema", "AP203")

    # Add your face to the STEP writer
    step_writer.Transfer(face, STEPControl_AsIs)

    # Write the file
    status = step_writer.Write(f"heights_{nx}_{ny}.step")

    if status != 0:
        print("Error: Unable to write STEP file.")
    else:
        print("STEP file successfully written.")


def make_3dm(heights):
    # Create a new mesh object
    mesh = r3d.Mesh()
    # Create points from your 2D array of heights
    for i, h in tqdm(enumerate(heights.flatten())):
        j = i % nx
        # Create a point at (i, j, height)
        # point = r3d.Point3d(i * dx, j * dx, h)
        # points.append(point)

        mesh.Vertices.Add(i*dx, j*dx, h*1000)

    # Define faces
    # This is a simple example assuming you have a grid of points and want to create quad faces
    # You'll need to adjust this logic based on your specific points and how they're ordered
    for i in tqdm(range(nx - 1)):  # width is the number of points in the x-direction
        for j in tqdm(range(ny - 1), leave=False):  # height is the number of points in the y-direction
            # Calculate the indices of the four corners of the face
            a = i + j * nx
            b = (i + 1) + j * nx
            c = (i + 1) + (j + 1) * nx
            d = i + (j + 1) * nx
            mesh.Faces.AddFace(a, b, c, d)

    # Create a surface from the points (assuming a rectangular grid of points)
    # surface = r3d.NurbsSurface.CreateFromPoints(points, nx, ny, 3, 3, False, False)

    # At this point, 'surface' is a BRep in rhino3dm
    brep = r3d.Brep.CreateFromMesh(mesh, True)

    # Save your BRep to a 3dm file (Rhino format)
    model = r3d.File3dm()
    # model.Objects.AddMesh(mesh)
    model.Objects.AddBrep(brep)
    model.Write('model.3dm', 7)


if __name__ == '__main__':
    make_BRep_OCC(heights)
    # make_3dm(heights)