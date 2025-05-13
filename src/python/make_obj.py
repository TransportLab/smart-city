import sys
import os
import json5
import numpy
import matplotlib.pyplot as plt
from tqdm import tqdm
import tifffile
import pymesh

with open('params.json5', 'r') as f:
    params = json5.load(f)

nx = int(params['model']['width'] / params['model']['pixel_size'])
ny = int(params['model']['height'] / params['model']['pixel_size'])
dx = params['model']['pixel_size']

heights = tifffile.imread(f'heights_{nx}_{ny}.tif')
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
        
        faces.append([a, b, c, d])

for i in range(nx):
    for j in range(ny):
        vertices.append([i*dx, j*dx, 0])

# Define faces
# This is a simple example assuming you have a grid of points and want to create quad faces
# You'll need to adjust this logic based on your specific points and how they're ordered
for i in tqdm(range(nx - 1)):  # width is the number of points in the x-direction
    for j in tqdm(range(ny - 1), leave=False):  # height is the number of points in the y-direction
        # Calculate the indices of the four corners of the face
        a = i *ny + j + nx*ny
        b = (i + 1) * ny + j + nx*ny
        c = i * ny + (j + 1) + nx*ny
        d = (i + 1) * ny + (j + 1) + nx*ny
        
        faces.append([a, b, c, d])

for i in range(nx):
    faces.append([i*ny, i*ny+ny, i*ny+ny+nx*ny, i*ny+nx*ny])
    faces.append([i*ny, i*ny+nx*ny, i*ny+nx*ny+ny, i*ny+ny+ny])

for i in range(ny):
    faces.append([i, i+1, i+1+nx*ny, i+nx*ny])
    faces.append([i, i+nx*ny, i+nx*ny+1, i+1])

vertices = numpy.array(vertices)
faces = numpy.array(faces)

mesh = pymesh.form_mesh(vertices, faces)
pymesh.save_mesh("test.stl", mesh)