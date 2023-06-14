


/**
 * Do a linear search to find the index
 * of the line segment L in arr so that CCW(L, target) >= 0
 * and getAngle(L, target) is as small as possible
 * 
 * @param {list of [x, y]} arr List of line segments
 * @param {[x, y]} target Target line segment
 */
function linearCCWSearch(arr, target) {
    let minIdx = 0;
    let smallestAngle = 2*Math.PI;
    const c = target[0];
    const d = target[1];
    for (let i = 0; i < arr.length; i++) {
        const a = arr[i][0];
        const b = arr[i][1];
        if (ccwLines(a, b, c, d) >= 0) {
            const angle = getAngle(a, b, c, d);
            if (angle < smallestAngle) {
                smallestAngle = angle;
                minIdx = i;
            }
        }
    }
    return minIdx;
}
