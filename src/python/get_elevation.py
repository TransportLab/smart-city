import sys
import os
import json5
import numpy
import matplotlib.pyplot as plt
import requests
import tifffile
from tqdm import tqdm

# ALTERNATIVE METHOD USING GDAL:
# gdalwarp -te 151.145 -33.895 151.265 -33.835 -dstnodata 0 lidar1m.vrt clipped.tif
# loaded in Fiji, ran a median filter to remove stitching artifacts, then saved as heights.jpg
# Used Image2Surface Addon in Autodesk Fusion 360 to convert to a BREP, then exported to a STEP file for machining. <---- DID NOT WORK, ENDED UP WITH A "SURFACE" NOT A CLOSED VOLUME
# Trying FreeCAD (import STL, convert to shape then export)

def create_grid(corners, nx, ny):
    ne = corners['ne']
    sw = corners['sw']

    # points = []  # List to hold all the points
    lats = numpy.linspace(sw['lat'], ne['lat'], ny + 1)
    lngs = numpy.linspace(sw['lng'], ne['lng'], nx + 1)
    
    return lats, lngs

def get_elevation_from_locations(i,j,width,height,lats,lngs):
    locations = ''
    for ii in range(i*M,i*M+width):
        for jj in range(j*N,j*N+height):
            locations += str(lats[jj]) + ',' + str(lngs[ii]) + '|'
    locations = locations[:-1] # remove last pipe

    url = params['model']['url'] + f"/v1/COP30m?locations={locations}"
    response = requests.get(url)
    # print(url)
    # Check if the request was successful
    if response.status_code == 200:
        # Parse the response as JSON
        return response.json()
    else:
        for key in response:
            print(key)
        sys.exit(f"Failed to retrieve the data with HTTP code: {response.status_code}")


def get_elevation(corners, width, height):
    # using elevationfast
    url = params['model']['url'] + f"/elevationfast?ne_lat={corners['ne']['lat']}&ne_lng={corners['ne']['lng']}&sw_lat={corners['sw']['lat']}&sw_lng={corners['sw']['lng']}&nx={width}&ny={height}"

    # using elevation --- NOT WORKING?!?!?!?
    # url = params['model']['url'] + f"elevation?region={corners['ne']['lat']},{corners['ne']['lng']};{corners['sw']['lat']},{corners['sw']['lng']};{width},{height}"
    
    response = requests.get(url)
    # print(url)
    # Check if the request was successful
    if response.status_code == 200:
        # Parse the response as JSON
        return response.json()
    else:
        for key in response:
            print(key)
        sys.exit(f"Failed to retrieve the data with HTTP code: {response.status_code}")

with open('params.json5', 'r') as f:
    params = json5.load(f)

nx = int(params['model']['width'] / params['model']['pixel_size'])
ny = int(params['model']['height'] / params['model']['pixel_size'])
dx = params['model']['pixel_size']

heights = -numpy.inf*numpy.ones([nx,ny]) # initialize to -inf so that we can use numpy.maximum to combine overlapping patches

# size of subpatch
M = 100 # if these go much above 1000, the server crashes and takes many hours to recover
N = 100

# number of subpatches
nM = int(numpy.ceil(nx / M))
nN = int(numpy.ceil(ny / N))

# create grid of latitudes and longitudes
lats, lngs = create_grid(params['model']['corners'], nx, ny)

# define overlapping subpatches to remove edge effects
overlap = int(M/10)

for i in tqdm(range(nM)):
    for j in tqdm(range(nN), leave=False):
        if i == 0:
            width = M + overlap
        elif i == nM-1:
            width = nx - i*M
        else:
            width = M + overlap
        if j == 0:
            height = N + overlap
        elif j == nN-1:
            height = ny - j*N
        else:
            height = N + overlap

        corners = {
            'ne': {
                'lat': lats[j*N+height],
                'lng': lngs[i*M+width]
            },
            'sw': {
                'lat': lats[j*N],
                'lng': lngs[i*M]
            }
        }        
        
        data = get_elevation(corners,width,height)
        # data = get_elevation_from_locations(i,j,width,height,lats,lngs)
        these_heights = numpy.array(data['results'][0]['elevation']).reshape([width,height], order='F')
        heights[i*M:i*M+width,j*N:j*N+height] = numpy.maximum(heights[i*M:i*M+width,j*N:j*N+height], numpy.fliplr(these_heights))

        plt.ion()
        plt.clf()
        plt.imshow(heights.T)
        plt.colorbar()
        plt.pause(1e-6)

tifffile.imwrite(f'heights_{nx}_{ny}.tif', heights)
