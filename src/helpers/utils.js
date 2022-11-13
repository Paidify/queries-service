// function that receives and object and returns the same object ignoring undefined values
export function removeUndefined(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        if (obj[key] !== undefined) {
            acc[key] = obj[key];
        }
        return acc;
    }, {});
}

export function genOwnerName(firstName, lastName) {
    return `${firstName.split(' ')[0]} ${lastName.split(' ')[0]}`.toUpperCase();
}

export function genEmail(username) {
    return username + '@univ.edu';
}

export function diff(obj1, obj2) {
    return Object.keys(obj1).reduce((acc, key) => {
        if (obj1[key] !== obj2[key]) {
            acc[key] = obj2[key];
        }
        return acc;
    }, {});
}
