# Yes, these packages need to be installed in the system.
# I'm too lazy to implement proper virtual env for Python.
# TODO: Actually implement virtual env for Python subprocess.

import cv2
import numpy as np
import base64
import json

def build_pyramid(image, levels=4):
    pyramid = [image]
    for _ in range(levels - 1):
        image = cv2.pyrDown(image)
        pyramid.append(image)
    return pyramid

def nms(boxes, confidence, iou_thresh=0.5):
    if len(boxes) == 0:
        return []
    
    boxes = np.array(boxes, dtype=np.float32)
    confidence = np.array(confidence, dtype=np.float32)
    
    sorted_idx = np.argsort(confidence)[::-1]
    
    keep = []
    while len(sorted_idx) > 0:
        current = sorted_idx[0]
        keep.append(current)
        
        if len(sorted_idx) == 1:
            break
        
        current_box = boxes[current]
        rest_boxes = boxes[sorted_idx[1:]]
        
        # Calculate IoU
        x1 = np.maximum(current_box[0], rest_boxes[:, 0])
        y1 = np.maximum(current_box[1], rest_boxes[:, 1])
        x2 = np.minimum(current_box[2], rest_boxes[:, 2])
        y2 = np.minimum(current_box[3], rest_boxes[:, 3])
        
        w = np.maximum(0, x2 - x1)
        h = np.maximum(0, y2 - y1)
        intersection = w * h
        
        box1_area = (current_box[2] - current_box[0]) * (current_box[3] - current_box[1])
        box2_area = (rest_boxes[:, 2] - rest_boxes[:, 0]) * (rest_boxes[:, 3] - rest_boxes[:, 1])
        union = box1_area + box2_area - intersection
        
        iou = intersection / (union + 1e-6)
        
        # Keep boxes with low IoU
        sorted_idx = sorted_idx[1:][iou < iou_thresh]
    
    return keep

def tpl_match(img_rgb, tmpl, thresh=0.8, pyramid_levels=4):
    h_tmpl, w_tmpl = tmpl.shape[:2]
    
    img_pyramid = build_pyramid(img_rgb, pyramid_levels)
    tmpl_pyramid = build_pyramid(tmpl, pyramid_levels)
    
    all_matches = []
    
    # Search from coarsest to finest level.
    for level in range(pyramid_levels - 1, -1, -1):
        img_level = img_pyramid[level]
        tmpl_level = tmpl_pyramid[level]
        
        # Skip if template is larger than image at this level.
        if tmpl_level.shape[0] > img_level.shape[0] or tmpl_level.shape[1] > img_level.shape[1]:
            continue
        
        res = cv2.matchTemplate(img_level, tmpl_level, cv2.TM_CCOEFF_NORMED)

        loc = np.where(res >= thresh)
        
        # Convert pyramid coordinates back to original image coordinates.
        scale = 2 ** level
        for pt_y, pt_x in zip(loc[0], loc[1]):
            orig_x = pt_x * scale
            orig_y = pt_y * scale
            all_matches.append((orig_x, orig_y, res[pt_y, pt_x]))
    
    # Apply NMS to remove duplicates from different pyramid levels.
    if len(all_matches) == 0:
        return []
    
    boxes = []
    confidence = []
    for x, y, conf in all_matches:
        x1 = x
        y1 = y
        x2 = x + w_tmpl
        y2 = y + h_tmpl
        boxes.append([x1, y1, x2, y2])
        confidence.append(conf)
    
    keep_idx = nms(boxes, confidence, iou_thresh=0.5)
    matches = [all_matches[idx] for idx in keep_idx]
    
    return matches

def image_search(screenshot_base64: str, template_base64: str, threshold: float = 0.8):
    screenshot = base64.b64decode(screenshot_base64)
    screenshot_cv = cv2.imdecode(np.asarray(bytearray(screenshot), dtype=np.uint8), cv2.IMREAD_COLOR)
    
    template = base64.b64decode(template_base64)
    template_cv = cv2.imdecode(np.asarray(bytearray(template), dtype=np.uint8), cv2.IMREAD_COLOR)
    
    h, w = template_cv.shape[:2]
    
    matches = tpl_match(screenshot_cv, template_cv, thresh=threshold, pyramid_levels=4)
    
    # Convert to center points.
    center_points = []
    for x, y, confidence in matches:
        center_x = x + w // 2
        center_y = y + h // 2
        center_points.append((center_x, center_y, confidence))
    
    return [
        {
            "point": (float(matches[0]), float(matches[1])),
            "confidence": float(matches[2]),
        }
        for matches in center_points
    ]
    
while True:
    screenshot_base64 = input()
    template_base64 = input()
    threshold = float(input())

    data = image_search(screenshot_base64, template_base64, threshold)

    print(json.dumps(data))
