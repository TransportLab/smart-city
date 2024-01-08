import sys
import json5
import numpy
import matplotlib.pyplot as plt
import requests
import rhino3dm as r3d

def create_grid(corners, nx, ny):
    ne = corners['ne']
    sw = corners['sw']

    # points = []  # List to hold all the points
    lats = numpy.linspace(sw['lat'], ne['lat'], ny + 1)
    lngs = numpy.linspace(sw['lng'], ne['lng'], nx + 1)
    
    return lats, lngs


def get_elevation(top_lng, bottom_lng, this_ny):
    url = params['model']['url'] + f"?ne_lat={params['model']['corners']['ne']['lat']}&ne_lng={top_lng}&sw_lat={params['model']['corners']['sw']['lat']}&sw_lng={bottom_lng}&nx={nx}&ny={this_ny}"
    response = requests.get(url)
    # print(url)
    # Check if the request was successful
    if response.status_code == 200:
        # Parse the response as JSON
        return response.json()
    else:
        sys.exit(f"Failed to retrieve the data with HTTP code: {response.status_code}")

with open('params.json5', 'r') as f:
    params = json5.load(f)

nx = int(params['model']['width'] / params['model']['pixel_size'])
ny = int(params['model']['height'] / params['model']['pixel_size'])
dx = params['model']['pixel_size']

max_points = 10000
chunk_size = int(numpy.ceil(max_points / nx))
ny_chunks = int(numpy.ceil(ny / chunk_size))

heights = numpy.zeros([nx,ny])
sample_points = numpy.arange(0,ny,chunk_size)

lats, lngs = create_grid(params['model']['corners'], nx, ny)

for i,y in enumerate(sample_points):
    top_lng = lngs[y]
    bottom_lng = lngs[sample_points[i+1]-1]
    this_ny = sample_points[i+1] - y
    data = get_elevation(top_lng,bottom_lng,this_ny)
    these_heights = data['results'][0]['elevation']
    heights[i:i+this_ny] = these_heights
# Initialize your 2D height array


# Create a new mesh object
mesh = r3d.Mesh()
# Create points from your 2D array of heights
for i, h in enumerate(heights):
    j = i % nx
    # Create a point at (i, j, height)
    # point = r3d.Point3d(i * dx, j * dx, h)
    # points.append(point)

    mesh.Vertices.Add(i*dx, j*dx, h*1000)

# Define faces
# This is a simple example assuming you have a grid of points and want to create quad faces
# You'll need to adjust this logic based on your specific points and how they're ordered
for i in range(nx - 1):  # width is the number of points in the x-direction
    for j in range(ny - 1):  # height is the number of points in the y-direction
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

# For STEP export, you'll need to use Rhino or another tool that can read 3dm and export to STEP.
