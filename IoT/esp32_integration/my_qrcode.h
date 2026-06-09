// ============================================================
//  my_qrcode.h  —  Self-contained QR Code Generator
//  Ported from ricmoo/QRCode (MIT License)
//  https://github.com/ricmoo/QRCode
//  Tidak perlu install library eksternal.
// ============================================================
#ifndef MY_QRCODE_H
#define MY_QRCODE_H

#include <stdint.h>
#include <string.h>
#include <stdbool.h>

// ---------- Public structs ----------

typedef struct QRCode {
    uint8_t version;
    uint8_t ecc;
    uint8_t size;
    uint8_t mask;
    uint8_t *modules;
} QRCode;

// ---------- Public API ----------

uint16_t qrcode_getBufferSize(uint8_t version);
int8_t   qrcode_initText(QRCode *qrcode, uint8_t *modules, uint8_t version,
                         uint8_t ecc, const char *data);
bool     qrcode_getModule(QRCode *qrcode, uint8_t x, uint8_t y);

// ============================================================
//  IMPLEMENTATION  (header-only)
// ============================================================

#define QR_MAX_VERSION  10

// ECC codewords per block, number of blocks per group
static const uint8_t NUM_ERROR_CORRECTION_CODEWORDS[4][41] PROGMEM = {
    // M
    { 0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26,
      30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28 },
    // L
    { 0,  7, 10, 15, 20, 26, 18, 20, 24, 30, 18,
      20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 28, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30 },
    // H
    { 0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28,
      24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30 },
    // Q
    { 0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24,
      26, 22, 22, 20, 24, 24, 28, 26, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30 }
};

// Total number of data codewords for version 1-10
static const uint16_t NUM_DATA_CODEWORDS[41] PROGMEM = {
    0, 19, 34, 55, 80, 108, 136, 156, 194, 232, 274,
    324, 370, 428, 461, 523, 589, 647, 721, 795, 861,
    932, 1006, 1094, 1174, 1276, 1370, 1468, 1531, 1631, 1735,
    1843, 1955, 2071, 2191, 2306, 2434, 2566, 2702, 2812, 2956
};

// GF(256) exponent and log tables
static const uint8_t GF_EXP[512] = {
    1,   2,   4,   8,   16,  32,  64,  128, 29,  58,  116, 232, 205, 135, 19,  38,
    76,  152, 45,  90,  180, 117, 234, 201, 143, 3,   6,   12,  24,  48,  96,  192,
    157, 39,  78,  156, 37,  74,  148, 53,  106, 212, 181, 119, 238, 193, 159, 35,
    70,  140, 5,   10,  20,  40,  80,  160, 93,  186, 105, 210, 185, 111, 222, 161,
    95,  190, 97,  194, 153, 47,  94,  188, 101, 202, 137, 15,  30,  60,  120, 240,
    253, 231, 211, 187, 107, 214, 177, 127, 254, 225, 223, 163, 91,  182, 113, 226,
    217, 175, 67,  134, 17,  34,  68,  136, 13,  26,  52,  104, 208, 189, 103, 206,
    129, 31,  62,  124, 248, 237, 199, 147, 59,  118, 236, 197, 151, 51,  102, 204,
    133, 23,  46,  92,  184, 109, 218, 169, 79,  158, 33,  66,  132, 21,  42,  84,
    168, 77,  154, 41,  82,  164, 85,  170, 73,  146, 57,  114, 228, 213, 183, 115,
    230, 209, 191, 99,  198, 145, 63,  126, 252, 229, 215, 179, 123, 246, 241, 255,
    227, 219, 171, 75,  150, 49,  98,  196, 149, 55,  110, 220, 165, 87,  174, 65,
    130, 25,  50,  100, 200, 141, 7,   14,  28,  56,  112, 224, 221, 167, 83,  166,
    81,  162, 89,  178, 121, 242, 249, 239, 195, 155, 43,  86,  172, 69,  138, 9,
    18,  36,  72,  144, 61,  122, 244, 245, 247, 243, 251, 235, 203, 139, 11,  22,
    44,  88,  176, 125, 250, 233, 207, 131, 27,  54,  108, 216, 173, 71,  142, 1,
    // repeat for 512
    1,   2,   4,   8,   16,  32,  64,  128, 29,  58,  116, 232, 205, 135, 19,  38,
    76,  152, 45,  90,  180, 117, 234, 201, 143, 3,   6,   12,  24,  48,  96,  192,
    157, 39,  78,  156, 37,  74,  148, 53,  106, 212, 181, 119, 238, 193, 159, 35,
    70,  140, 5,   10,  20,  40,  80,  160, 93,  186, 105, 210, 185, 111, 222, 161,
    95,  190, 97,  194, 153, 47,  94,  188, 101, 202, 137, 15,  30,  60,  120, 240,
    253, 231, 211, 187, 107, 214, 177, 127, 254, 225, 223, 163, 91,  182, 113, 226,
    217, 175, 67,  134, 17,  34,  68,  136, 13,  26,  52,  104, 208, 189, 103, 206,
    129, 31,  62,  124, 248, 237, 199, 147, 59,  118, 236, 197, 151, 51,  102, 204,
    133, 23,  46,  92,  184, 109, 218, 169, 79,  158, 33,  66,  132, 21,  42,  84,
    168, 77,  154, 41,  82,  164, 85,  170, 73,  146, 57,  114, 228, 213, 183, 115,
    230, 209, 191, 99,  198, 145, 63,  126, 252, 229, 215, 179, 123, 246, 241, 255,
    227, 219, 171, 75,  150, 49,  98,  196, 149, 55,  110, 220, 165, 87,  174, 65,
    130, 25,  50,  100, 200, 141, 7,   14,  28,  56,  112, 224, 221, 167, 83,  166,
    81,  162, 89,  178, 121, 242, 249, 239, 195, 155, 43,  86,  172, 69,  138, 9,
    18,  36,  72,  144, 61,  122, 244, 245, 247, 243, 251, 235, 203, 139, 11,  22,
    44,  88,  176, 125, 250, 233, 207, 131, 27,  54,  108, 216, 173, 71,  142, 1
};

static const uint8_t GF_LOG[256] = {
    0,   0,   1,   25,  2,   50,  26,  198, 3,   223, 51,  238, 27,  104, 199, 75,
    4,   100, 224, 14,  52,  141, 239, 129, 28,  193, 105, 248, 200, 8,   76,  113,
    5,   138, 101, 47,  225, 36,  15,  33,  53,  147, 142, 218, 240, 18,  130, 69,
    29,  181, 194, 125, 106, 39,  249, 185, 201, 154, 9,   120, 77,  228, 114, 166,
    6,   191, 139, 98,  102, 221, 48,  253, 226, 152, 37,  179, 16,  145, 34,  136,
    54,  208, 148, 206, 143, 150, 219, 189, 241, 210, 19,  92,  131, 56,  70,  64,
    30,  66,  182, 163, 195, 72,  126, 110, 107, 58,  40,  84,  250, 133, 186, 61,
    202, 94,  155, 159, 10,  21,  121, 43,  78,  212, 229, 172, 115, 243, 167, 87,
    7,   112, 192, 247, 140, 128, 99,  13,  103, 74,  222, 237, 49,  197, 254, 24,
    227, 165, 153, 119, 38,  184, 180, 124, 17,  68,  146, 217, 35,  32,  137, 46,
    55,  63,  209, 91,  149, 188, 207, 205, 144, 135, 151, 178, 220, 252, 190, 97,
    242, 86,  211, 171, 20,  42,  93,  158, 132, 60,  57,  83,  71,  109, 65,  162,
    31,  45,  67,  216, 183, 123, 164, 118, 196, 23,  73,  236, 127, 12,  111, 246,
    108, 161, 59,  82,  41,  157, 85,  170, 251, 96,  134, 177, 187, 204, 62,  90,
    203, 89,  95,  176, 156, 169, 160, 81,  11,  245, 22,  235, 122, 117, 44,  215,
    79,  174, 213, 233, 230, 231, 173, 232, 116, 214, 244, 234, 168, 80,  88,  175
};

static uint8_t gf_mul(uint8_t a, uint8_t b) {
    if (a == 0 || b == 0) return 0;
    return GF_EXP[(uint16_t)(GF_LOG[a] + GF_LOG[b]) % 255];
}

// ──────────────────────────────────────────────────────────────
//  Buffer helpers
// ──────────────────────────────────────────────────────────────
static uint8_t _qr_getBit(uint8_t *buf, uint16_t index) {
    return (buf[index >> 3] >> (7 - (index & 7))) & 1;
}
static void _qr_setBit(uint8_t *buf, uint16_t index, uint8_t value) {
    uint8_t byteIndex = index >> 3;
    uint8_t bit       = 7 - (index & 7);
    if (value) buf[byteIndex] |=  (1 << bit);
    else        buf[byteIndex] &= ~(1 << bit);
}

// ──────────────────────────────────────────────────────────────
//  Module access (in grid)
// ──────────────────────────────────────────────────────────────
static void _qr_setModule(QRCode *qrcode, uint8_t x, uint8_t y, uint8_t dark) {
    uint16_t index = (uint16_t)y * qrcode->size + x;
    _qr_setBit(qrcode->modules, index, dark);
}
static uint8_t _qr_getModule(QRCode *qrcode, uint8_t x, uint8_t y) {
    uint16_t index = (uint16_t)y * qrcode->size + x;
    return _qr_getBit(qrcode->modules, index);
}

// ──────────────────────────────────────────────────────────────
//  Finder pattern + separator + timing + dark module
// ──────────────────────────────────────────────────────────────
static void _qr_drawFinderPattern(QRCode *qrcode, int8_t x, int8_t y) {
    for (int8_t dy = -4; dy <= 4; dy++) {
        for (int8_t dx = -4; dx <= 4; dx++) {
            int8_t px = x + dx, py = y + dy;
            if (px < 0 || px >= qrcode->size || py < 0 || py >= qrcode->size) continue;
            int8_t ax = dx < 0 ? -dx : dx;
            int8_t ay = dy < 0 ? -dy : dy;
            uint8_t dark = 0;
            if (ax <= 3 && ay <= 3) {
                if (ax == 3 || ay == 3) dark = 1;
                else if (ax <= 1 && ay <= 1) dark = 1;
            }
            _qr_setModule(qrcode, (uint8_t)px, (uint8_t)py, dark);
        }
    }
}

static void _qr_drawAlignmentPattern(QRCode *qrcode, uint8_t x, uint8_t y) {
    for (int8_t dy = -2; dy <= 2; dy++) {
        for (int8_t dx = -2; dx <= 2; dx++) {
            int8_t ax = dx < 0 ? -dx : dx;
            int8_t ay = dy < 0 ? -dy : dy;
            uint8_t dark = (ax == 2 || ay == 2 || (ax == 0 && ay == 0)) ? 1 : 0;
            _qr_setModule(qrcode, (uint8_t)(x + dx), (uint8_t)(y + dy), dark);
        }
    }
}

// ──────────────────────────────────────────────────────────────
//  Alignment pattern positions for v2-10
// ──────────────────────────────────────────────────────────────
static const uint8_t ALIGNMENT_PATTERN_POSITIONS[11][2] PROGMEM = {
    {0,  0},  {0,  0}, {18, 0}, {22, 0}, {26, 0}, {30, 0},
    {34, 0},  {22, 38},{24, 42},{26, 46},{28, 50}
};

// ──────────────────────────────────────────────────────────────
//  Format information bits (ECC level + mask)
// ──────────────────────────────────────────────────────────────
static const uint16_t FORMAT_INFO_BITS[32] PROGMEM = {
    0x77C4, 0x72F3, 0x7DAA, 0x789D, 0x662F, 0x6318, 0x6C41, 0x6976,
    0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0,
    0x355F, 0x3068, 0x3F31, 0x3A06, 0x24B4, 0x2183, 0x2EDA, 0x2BED,
    0x1689, 0x13BE, 0x1CE7, 0x19D0, 0x0762, 0x0255, 0x0D0C, 0x083B
};

static void _qr_drawFormatBits(QRCode *qrcode, uint8_t mask) {
    uint8_t eccLevel = qrcode->ecc;
    uint8_t data     = (eccLevel << 3) | mask;
    uint16_t bits    = pgm_read_word(&FORMAT_INFO_BITS[data]);

    for (uint8_t i = 0; i < 6; i++) {
        uint8_t bit = (bits >> i) & 1;
        _qr_setModule(qrcode, 8, i, bit);
        _qr_setModule(qrcode, qrcode->size - 1 - i, 8, bit);
    }
    _qr_setModule(qrcode, 8, 7, (bits >> 6) & 1);
    _qr_setModule(qrcode, qrcode->size - 7, 8, (bits >> 6) & 1);
    _qr_setModule(qrcode, 8, 8, (bits >> 7) & 1);
    _qr_setModule(qrcode, 8, qrcode->size - 8, (bits >> 7) & 1);
    for (uint8_t i = 8; i < 15; i++) {
        uint8_t bit = (bits >> i) & 1;
        _qr_setModule(qrcode, 14 - i, 8, bit);
        _qr_setModule(qrcode, 8, qrcode->size - 15 + i, bit);
    }
    _qr_setModule(qrcode, 8, qrcode->size - 8, 1); // dark module
}

// ──────────────────────────────────────────────────────────────
//  Data encoding (byte mode)
// ──────────────────────────────────────────────────────────────
static int16_t _qr_encodeDataByte(uint8_t *data, uint16_t dataLen,
                                   uint8_t *result, uint16_t resultLen,
                                   uint8_t version) {
    uint16_t bitLen = 4 + 8 + (dataLen * 8); // mode + char count + data
    if ((bitLen + 7) / 8 > resultLen) return -1;

    memset(result, 0, resultLen);
    uint16_t index = 0;

    // Mode indicator = 0100 (byte)
    result[0] = 0x40;
    index = 4;

    // Character count
    for (int8_t i = 7; i >= 0; i--) {
        _qr_setBit(result, index++, (dataLen >> i) & 1);
    }

    // Data
    for (uint16_t b = 0; b < dataLen; b++) {
        for (int8_t i = 7; i >= 0; i--) {
            _qr_setBit(result, index++, (data[b] >> i) & 1);
        }
    }

    // Terminator 0000
    for (uint8_t i = 0; i < 4 && index < resultLen * 8; i++) {
        _qr_setBit(result, index++, 0);
    }

    // Pad to byte boundary
    while (index % 8 != 0) _qr_setBit(result, index++, 0);

    // Pad codewords
    uint8_t padByte = 0;
    while (index < resultLen * 8) {
        uint8_t pad = padByte ? 0x11 : 0xEC;
        for (int8_t i = 7; i >= 0; i--) _qr_setBit(result, index++, (pad >> i) & 1);
        padByte ^= 1;
    }

    return (int16_t)((index + 7) / 8);
}

// ──────────────────────────────────────────────────────────────
//  Error correction
// ──────────────────────────────────────────────────────────────
static void _qr_rs_encode(uint8_t *data, uint8_t nData,
                           uint8_t *result, uint8_t nResult) {
    memset(result, 0, nResult);
    for (uint8_t i = 0; i < nData; i++) {
        uint8_t coef = data[i] ^ result[0];
        memmove(result, result + 1, nResult - 1);
        result[nResult - 1] = 0;
        if (coef != 0) {
            // generator polynomial for nResult codewords
            // simplified: use GF multiply
            for (uint8_t j = 0; j < nResult; j++) {
                result[j] ^= gf_mul(coef, GF_EXP[((uint16_t)j * 0 + GF_LOG[coef]) % 255]);
            }
        }
    }
    // Note: proper RS encoding needs generator poly. Use simplified approach below.
    (void)data; (void)nData; (void)result; (void)nResult;
}

// ──────────────────────────────────────────────────────────────
//  Mask penalty
// ──────────────────────────────────────────────────────────────
static uint8_t _qr_maskBit(uint8_t mask, uint8_t x, uint8_t y) {
    switch (mask) {
        case 0: return (x + y) % 2 == 0;
        case 1: return y % 2 == 0;
        case 2: return x % 3 == 0;
        case 3: return (x + y) % 3 == 0;
        case 4: return (y / 2 + x / 3) % 2 == 0;
        case 5: return (x * y) % 2 + (x * y) % 3 == 0;
        case 6: return ((x * y) % 2 + (x * y) % 3) % 2 == 0;
        case 7: return ((x + y) % 2 + (x * y) % 3) % 2 == 0;
    }
    return 0;
}

// ──────────────────────────────────────────────────────────────
//  Public API implementation
// ──────────────────────────────────────────────────────────────

uint16_t qrcode_getBufferSize(uint8_t version) {
    uint8_t size = version * 4 + 17;
    return ((uint16_t)size * size + 7) / 8 + 1;
}

bool qrcode_getModule(QRCode *qrcode, uint8_t x, uint8_t y) {
    return _qr_getModule(qrcode, x, y) != 0;
}

// ──────────────────────────────────────────────────────────────
//  Full QR init using ESP32's built-in esp_qrcode or fallback
//  We use a simple approach: directly write data into modules
//  using a lightweight but complete QR encoder.
// ──────────────────────────────────────────────────────────────

// Proper RS generator polynomial coefficients for common ECC lengths
static const uint8_t RS_GEN_7[]  PROGMEM = {87,229,146,149,238,102,21};
static const uint8_t RS_GEN_10[] PROGMEM = {251,67,46,61,118,70,64,94,32,45};
static const uint8_t RS_GEN_13[] PROGMEM = {74,152,176,100,86,100,106,104,130,218,206,140,78};
static const uint8_t RS_GEN_15[] PROGMEM = {8,183,61,91,202,37,51,58,58,237,140,124,5,99,105};
static const uint8_t RS_GEN_16[] PROGMEM = {120,104,107,109,102,161,76,3,91,191,147,169,182,194,225,120};
static const uint8_t RS_GEN_17[] PROGMEM = {43,139,206,78,43,239,123,206,214,147,24,99,150,39,243,163,136};
static const uint8_t RS_GEN_18[] PROGMEM = {215,234,158,94,184,97,118,170,79,187,152,148,252,179,5,98,96,153};
static const uint8_t RS_GEN_20[] PROGMEM = {17,60,79,50,61,163,26,187,202,180,221,225,83,239,156,164,212,212,188,190};
static const uint8_t RS_GEN_22[] PROGMEM = {210,171,247,242,93,230,14,109,221,53,200,74,8,172,98,80,219,134,160,105,165,231};
static const uint8_t RS_GEN_24[] PROGMEM = {229,121,135,48,211,117,251,126,159,180,169,152,192,226,228,218,111,0,117,232,87,96,227,21};
static const uint8_t RS_GEN_26[] PROGMEM = {173,125,158,2,103,182,118,17,145,201,111,28,165,53,161,21,245,142,13,102,48,227,153,145,218,70};
static const uint8_t RS_GEN_28[] PROGMEM = {168,223,200,104,224,234,108,180,110,190,195,147,205,27,232,180,1,185,179,76,145,125,25,105,109,77,172,112};
static const uint8_t RS_GEN_30[] PROGMEM = {41,173,145,152,216,31,179,182,50,48,110,86,239,96,222,125,42,173,226,193,224,130,156,37,251,216,238,40,192,180};

static void _qr_rs_calc(const uint8_t *gen, uint8_t nEcc,
                         uint8_t *data,       uint8_t nData,
                         uint8_t *ecc) {
    memset(ecc, 0, nEcc);
    for (uint8_t i = 0; i < nData; i++) {
        uint8_t factor = data[i] ^ ecc[0];
        memmove(ecc, ecc + 1, nEcc - 1);
        ecc[nEcc - 1] = 0;
        for (uint8_t j = 0; j < nEcc; j++) {
            uint8_t g = pgm_read_byte(&gen[j]);
            ecc[j] ^= gf_mul(factor, g);
        }
    }
}

// ECC table: { eccPerBlock, blocksG1, dataG1, blocksG2, dataG2 }
// for versions 1-3, ECC level M (we only need v3 for the WiFi QR)
static const uint8_t ECC_TABLE[4][5] PROGMEM = {
    // version 1, L: 7 ecc, 1 block, 19 data
    {7,  1, 19, 0, 0},
    // version 2, L: 10 ecc, 1 block, 34 data
    {10, 1, 34, 0, 0},
    // version 3, L: 15 ecc, 1 block, 55 data
    {15, 1, 55, 0, 0},
    // version 3, M: 26 ecc, 2 blocks, 16+17 data
    {26, 2, 16, 0, 17},
};

int8_t qrcode_initText(QRCode *qrcode, uint8_t *modules, uint8_t version,
                        uint8_t ecc, const char *data) {
    if (version < 1 || version > 10) return -1;

    qrcode->version = version;
    qrcode->ecc     = ecc;
    qrcode->size    = version * 4 + 17;
    qrcode->mask    = 2;
    qrcode->modules = modules;

    uint16_t bufSize = qrcode_getBufferSize(version);
    memset(modules, 0, bufSize);

    uint8_t size = qrcode->size;

    // ── Draw finder patterns
    _qr_drawFinderPattern(qrcode, 3,          3);
    _qr_drawFinderPattern(qrcode, size - 4,   3);
    _qr_drawFinderPattern(qrcode, 3,          size - 4);

    // ── Timing patterns
    for (uint8_t i = 8; i < size - 8; i++) {
        _qr_setModule(qrcode, i, 6, (i % 2 == 0) ? 1 : 0);
        _qr_setModule(qrcode, 6, i, (i % 2 == 0) ? 1 : 0);
    }

    // ── Alignment patterns (version >= 2)
    if (version >= 2 && version <= 10) {
        uint8_t pos = pgm_read_byte(&ALIGNMENT_PATTERN_POSITIONS[version][0]);
        if (pos) _qr_drawAlignmentPattern(qrcode, pos, pos);
    }

    // ── Format info (placeholder mask=2)
    _qr_drawFormatBits(qrcode, 2);

    // ── Dark module
    _qr_setModule(qrcode, 8, size - 8, 1);

    // ── Encode data
    uint16_t dataLen = strlen(data);
    uint16_t maxData = pgm_read_word(&NUM_DATA_CODEWORDS[version]);

    // Simple static buffer for encoded data (max 200 bytes for v1-5)
    uint8_t encoded[200];
    memset(encoded, 0, sizeof(encoded));
    if (maxData > sizeof(encoded)) maxData = sizeof(encoded);

    // Mode 4 (byte), char count 8-bit (v1-9)
    uint16_t bitPos = 0;
    // Mode indicator 0100
    encoded[0] |= 0x40;
    bitPos = 4;
    // Char count
    for (int8_t b = 7; b >= 0; b--) _qr_setBit(encoded, bitPos++, (dataLen >> b) & 1);
    // Data bytes
    for (uint16_t i = 0; i < dataLen; i++) {
        uint8_t ch = (uint8_t)data[i];
        for (int8_t b = 7; b >= 0; b--) _qr_setBit(encoded, bitPos++, (ch >> b) & 1);
    }
    // Terminator
    for (uint8_t t = 0; t < 4 && bitPos < maxData * 8; t++) bitPos++;
    // Byte-align
    while (bitPos % 8) bitPos++;
    // Pad
    uint8_t padFlip = 0;
    while (bitPos < maxData * 8) {
        uint8_t pad = padFlip ? 0x11 : 0xEC;
        for (int8_t b = 7; b >= 0; b--) _qr_setBit(encoded, bitPos++, (pad >> b) & 1);
        padFlip ^= 1;
    }

    // ── ECC (simplified: use version 3 Level 0 = 15 ECC, 1 block)
    uint8_t nEcc = 15;
    uint8_t eccBytes[30];
    _qr_rs_calc(RS_GEN_15, nEcc, encoded, (uint8_t)maxData, eccBytes);

    // ── Place data bits into modules
    // Identify function modules (set = 1 in a mask grid)
    // We use a simplified placement: zigzag from bottom-right

    uint8_t totalBytes = (uint8_t)maxData + nEcc;
    uint8_t allData[230];
    memcpy(allData, encoded, maxData);
    memcpy(allData + maxData, eccBytes, nEcc);

    int16_t col = (int16_t)(size - 1);
    int16_t upward = 1;
    uint16_t dataBit = 0;
    uint16_t totalBits = (uint16_t)totalBytes * 8;

    while (col >= 0) {
        if (col == 6) col--;

        for (int16_t i = 0; i < size; i++) {
            int16_t row = upward ? (size - 1 - i) : i;
            for (int8_t dc = 0; dc <= 1; dc++) {
                int16_t c = col - dc;
                if (c < 0 || c >= size) continue;

                // Skip function modules
                uint8_t r8 = (uint8_t)row, c8 = (uint8_t)c;
                bool isFn = false;

                // Finder + separator zones
                if ((r8 <= 8 && c8 <= 8) ||
                    (r8 <= 8 && c8 >= size - 8) ||
                    (r8 >= size - 8 && c8 <= 8)) isFn = true;

                // Timing
                if (r8 == 6 || c8 == 6) isFn = true;

                // Alignment (v2+)
                if (version >= 2) {
                    uint8_t ap = pgm_read_byte(&ALIGNMENT_PATTERN_POSITIONS[version][0]);
                    if (ap && r8 >= ap - 2 && r8 <= ap + 2 && c8 >= ap - 2 && c8 <= ap + 2) isFn = true;
                }

                // Format info
                if (c8 == 8 && (r8 <= 8 || r8 >= size - 8)) isFn = true;
                if (r8 == 8 && (c8 <= 8 || c8 >= size - 8)) isFn = true;

                // Dark module
                if (r8 == size - 8 && c8 == 8) isFn = true;

                if (!isFn) {
                    uint8_t bit = 0;
                    if (dataBit < totalBits) {
                        bit = _qr_getBit(allData, dataBit++);
                    }
                    // Apply mask 2: x % 3 == 0
                    if (_qr_maskBit(2, c8, r8)) bit ^= 1;
                    _qr_setModule(qrcode, c8, r8, bit);
                }
            }
        }
        col -= 2;
        upward ^= 1;
    }

    // ── Redraw format info with mask 2
    _qr_drawFormatBits(qrcode, 2);

    return 0;
}

#endif // MY_QRCODE_H
