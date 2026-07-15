"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.db = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
(0, app_1.initializeApp)();
exports.db = (0, firestore_1.getFirestore)();
exports.storage = (0, storage_1.getStorage)();
//# sourceMappingURL=firebase_db.js.map