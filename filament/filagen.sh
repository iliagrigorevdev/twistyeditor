#!/bin/bash

filamesh --compress prism.obj ../public/res/prism.filamesh
matc -a opengl -p mobile -o ../public/res/prism.filamat prism.mat
