import { CARD_FIRST_DIGIT_ALLOWED } from "../config/constants.js";

export function removeUndefined(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        if (obj[key] !== undefined) {
            acc[key] = obj[key];
        }
        return acc;
    }, {});
}

export function removeNull(obj) {
    for (const key in obj) if (obj[key] === null) delete obj[key];
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

export function validateCardNumber(cardNumber) {
    if(!cardNumber) return false;
    cardNumber = String(cardNumber);
    return /^\d{16}$/.test(cardNumber) && CARD_FIRST_DIGIT_ALLOWED.includes(Number(cardNumber[0]));
}
