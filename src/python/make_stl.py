import sys
import os
import json5
import numpy
import matplotlib.pyplot as plt
from tqdm import tqdm
import tifffile
from stl import mesh

with open('params.json5', 'r') as f:
    params = json5.load(f)

nx = int(params['model']['width'] / params['model']['pixel_size'])
ny = int(params['model']['height'] / params['model']['pixel_size'])
dx = params['model']['pixel_size']

filename = sys.argv[1]
# heights = tifffile.imread(f'heights_{nx}_{ny}.tif').T
heights = tifffile.imread(filename).T
base_plane_height = -5

vertices = []
faces = []

for i in range(nx):
    for j in range(ny):
        vertices.append([i*dx, j*dx, heights[i,j]])
# Define faces
# This is a simple example assuming you have a grid of points and want to create quad faces
# You'll need to adjust this logic based on your specific points and how they're ordered
for i in tqdm(range(nx - 1)):  # width is the number of points in the x-direction
    for j in tqdm(range(ny - 1), leave=False):  # height is the number of points in the y-direction
        # Calculate the indices of the four corners of the face
        a = i *ny + j
        b = (i + 1) * ny + j
        c = i * ny + (j + 1)
        d = (i + 1) * ny + (j + 1)
        # stls are made of triangles, so need two per square
        faces.append([a, b, c])
        faces.append([b, d, c])

# # add first side wall
# for i in range(nx-1):
#     faces.append([i*ny, i*ny+ny, i*ny+ny+1])
#     faces.append([i*ny, i*ny+ny+1, i*ny+1])


vertices = numpy.array(vertices)
faces = numpy.array(faces)

total_faces = 2*faces.shape[0] + 4*(nx+ny)

# Create the mesh
model = mesh.Mesh(numpy.zeros(total_faces, dtype=mesh.Mesh.dtype))
for i, f in enumerate(faces):
    for j in range(3):
        model.vectors[i][j] = vertices[f[j],:]

# now the base plate
for i, f in enumerate(faces):
    model.vectors[faces.shape[0] + i][0] = [vertices[f[1],0], vertices[f[1],1], base_plane_height]
    model.vectors[faces.shape[0] + i][1] = [vertices[f[0],0], vertices[f[0],1], base_plane_height]
    model.vectors[faces.shape[0] + i][2] = [vertices[f[2],0], vertices[f[2],1], base_plane_height]

# first two side walls
for i in range(nx-1):
    model.vectors[2*faces.shape[0] + 4*i][0] = [i*dx, 0, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*i][1] = [(i+1)*dx, 0, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*i][2] = [i*dx, 0, heights[i,0]]

    model.vectors[2*faces.shape[0] + 4*i+1][0] = [i*dx, 0, heights[i,0]]
    model.vectors[2*faces.shape[0] + 4*i+1][1] = [(i+1)*dx, 0, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*i+1][2] = [(i+1)*dx, 0, heights[i+1,0]]

    model.vectors[2*faces.shape[0] + 4*i+2][1] = [i*dx, (ny-1)*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*i+2][0] = [(i+1)*dx, (ny-1)*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*i+2][2] = [i*dx, (ny-1)*dx, heights[i,ny-1]]

    model.vectors[2*faces.shape[0] + 4*i+3][1] = [i*dx, (ny-1)*dx, heights[i,ny-1]]
    model.vectors[2*faces.shape[0] + 4*i+3][0] = [(i+1)*dx, (ny-1)*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*i+3][2] = [(i+1)*dx, (ny-1)*dx, heights[i+1,ny-1]]

# # second two side walls
for i in range(ny-1):
    model.vectors[2*faces.shape[0] + 4*nx + 4*i][1] = [0, i*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i][0] = [0, (i+1)*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i][2] = [0, i*dx, heights[0,i]]

    model.vectors[2*faces.shape[0] + 4*nx + 4*i+1][1] = [0, i*dx, heights[0,i]]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i+1][0] = [0, (i+1)*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i+1][2] = [0, (i+1)*dx, heights[0,i+1]]

    model.vectors[2*faces.shape[0] + 4*nx + 4*i+2][0] = [(nx-1)*dx, i*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i+2][1] = [(nx-1)*dx, (i+1)*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i+2][2] = [(nx-1)*dx, i*dx, heights[nx-1,i]]

    model.vectors[2*faces.shape[0] + 4*nx + 4*i+3][0] = [(nx-1)*dx, i*dx, heights[nx-1,i]]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i+3][1] = [(nx-1)*dx, (i+1)*dx, base_plane_height]
    model.vectors[2*faces.shape[0] + 4*nx + 4*i+3][2] = [(nx-1)*dx, (i+1)*dx, heights[nx-1,i+1]]

model.update_normals()

# Write the mesh to file
model.save(filename.split('.')[0] + '.stl')