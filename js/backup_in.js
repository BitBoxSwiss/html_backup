//  If edit, update online zip file
//  and github repository by running:
//      ./make_backup.sh (digitalbitbox.com/make_backup.sh)

'use strict';


var Crypto = require('crypto');

var PBKDF2_SALT = 'Digital Bitbox',
    PBKDF2_HMACLEN = 64,
    PBKDF2_ROUNDS_MCU = 2048,
    PBKDF2_ROUNDS_APP = 20480;

var ui = {};
    
var fileUrl = null;
    
var err_backup_len = 'The backup text must be 64 characters long.',
    err_pw_len = 'The password must be at least 4 characters long.',
    err_user_len = 'Input must be at least 32 characters long.',
    err_user_cpy = 'Nice try wise guy.'; 
    


// ----------------------------------------------------------------------------


function init() {

    $("#splash-screen").effect("fade", {}, 1000, 0);
    
    // Create ui object from DOM id's in camelCase format
    var ids = document.querySelectorAll('[id]');
    Array.prototype.forEach.call( ids, function( element, i ) {
        var id = element.id;
        id = id.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
        ui[id] = element;     
    });

    ui.backupExportButton.addEventListener("click", backup_export, false);
    ui.backupCreateButton.addEventListener("click", backup_create, false);
    ui.backupGenerateButton.addEventListener("click", backup_generate, false);
    ui.backupClearButton.addEventListener("click", backup_clear, false);
    ui.backupEntropy.addEventListener("change", function(){ clear_notice(ui.backupEntropy); }, false);

    backup_clear();
}
window.onload = init;


// ----------------------------------------------------------------------------


function spinnerStart()
{
    ui.spinner.innerHTML = '<i class="fa fa-minus fa-spin fa-3x"></i>';
}


function spinnerStop()
{
    ui.spinner.innerHTML = '';
}


String.prototype.format = function()
{
    var content = this;
    for (var i=0; i < arguments.length; i++)
    {
        var replacement = '{' + i + '}';
        content = content.replace(replacement, arguments[i]);  
    }
    return content;
};


function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}


function pre_pad_10(number) {
    number = ("0000000000"+number).slice(-10);
    return number;
}


function chunk_string(str, length) {
  return str.match(new RegExp('.{1,' + length + '}', 'g'));
}


function makeTextFile(text) {
    var data = new Blob([text], {encoding:"UTF-8", type: 'text/plain'});
    if (fileUrl !== null) {
      window.URL.revokeObjectURL(fileUrl);
    }
    fileUrl = window.URL.createObjectURL(data);
    return fileUrl;
}


function backup_clear()
{
    ui.backupName.value = '';
    ui.backupEntropy.value = '';
    ui.backupUserEntropy.value = '';;
    ui.backupPassword.value = '';
    ui.backupXpriv.value = '';
    ui.backupElectrumBtcLegacy.value = '';
    ui.backupElectrumBtcSegwit.value = '';
    ui.backupElectrumBtcNativeSegwit.value = '';
    ui.backupElectrumBtcMultisig.value = '';
    ui.backupElectrumLtcLegacy.value = '';
    ui.backupElectrumLtcSegwit.value = '';
    ui.backupElectrumLtcNativeSegwit.value = '';
    ui.backupEthereumPrivateKeys.value = '';
    clear_notice(ui.backupEntropy);
    clear_notice(ui.backupXpriv);
    clear_notice(ui.backupPassword);
    clear_notice(ui.backupUserEntropy);
    clear_notice(ui.backupName);
    clear_notice(ui.backupElectrumBtcLegacy);
    clear_notice(ui.backupElectrumBtcSegwit);
    clear_notice(ui.backupElectrumBtcNativeSegwit);
    clear_notice(ui.backupElectrumBtcMultisig);
    clear_notice(ui.backupElectrumLtcLegacy);
    clear_notice(ui.backupElectrumLtcSegwit);
    clear_notice(ui.backupElectrumLtcNativeSegwit);
    clear_notice(ui.backupEthereumPrivateKeys);
}


function clear_notice(e)
{
    e.style.backgroundColor = "#fff";
}


$('#backup-name').keypress(function (e) {
    var chr = String.fromCharCode(e.which);
    if ("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-_".indexOf(chr) < 0)
        return false;
    return true;
});


function backup_export()
{
    var backuptext = ui.backupEntropy.value;
    var name = ui.backupName.value;
    
    clear_notice(ui.backupPassword);
    clear_notice(ui.backupXpriv);

    if (backuptext === '') {
        ui.backupEntropy.focus();
        ui.backupEntropy.style.backgroundColor = "#fcc";
        return;
    }
    
    if (ui.backupEntropy.value.length != 64) {
        ui.backupEntropy.focus();
        ui.backupXpriv.style.backgroundColor = "#fcc";
        ui.backupXpriv.value = err_backup_len;
        return;
    }
    
    if (ui.backupXpriv.value === err_backup_len || ui.backupXpriv.value === err_pw_len) {
        ui.backupXpriv.value = '';
        clear_notice(ui.backupXpriv);
    }
    
    if (name === '') {
        ui.backupName.focus();
        ui.backupName.style.backgroundColor = "#fcc";
        return;
    }
    
    clear_notice(ui.backupName);

    var BACKUP_DELIM_S = '-',
        SD_PDF_LINE_BUF_SIZE = 128,
        SD_PDF_HEAD = "%PDF-1.1\n",
        SD_PDF_1_0 = "1 0 obj\n<</Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n",
        SD_PDF_2_0 = "2 0 obj\n<</Type /Pages\n/Kids [3 0 R]\n/Count 1\n/MediaBox [0 0 595 842]\n>>\nendobj\n",
        SD_PDF_3_0 = "3 0 obj\n<</Type /Page\n/Parent 2 0 R\n/Resources\n<</Font\n<</F1\n<</Type /Font\n/BaseFont /Helvetica\n/Subtype /Type1\n>>\n>>\n>>\n/Contents 4 0 R\n>>\nendobj\n",
        SD_PDF_4_0_HEAD = "4 0 obj\n<< /Length {0} >>\nstream\n",
        SD_PDF_BACKUP_START = "<20 2020202020> Tj",
        SD_PDF_BACKUP_END = "<2020202020 20> Tj",
        SD_PDF_TEXT_START = "BT\n/F1 12 Tf\n50 700 Td\n(Wallet backup:) Tj\n" + SD_PDF_BACKUP_START + "\n0 -24 Td\n(",
        SD_PDF_TEXT_CONTINUE = ") Tj\n0 -16 Td\n(",
        SD_PDF_TEXT_END = ") Tj\n0 -16 Td\n%(" + BACKUP_DELIM_S + name + ") Tj\n" + SD_PDF_BACKUP_END + "\n0 -48 Td\n(Wallet name: " + name + ") Tj\n0 -32 Td\n(Passphrase:  ______________________) Tj\n/F1 10 Tf\n0 -60 Td\n(digitalbitbox.com/backup) Tj\nET\n",
        SD_PDF_4_0_END = "\nendstream\nendobj\n",
        SD_PDF_END = "xref\n0 5\n0000000000 65535 f \n{0} 00000 n \n{1} 00000 n \n{2} 00000 n \n{3} 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n{4}\n%%%%%%%%EOF";


    var stream_len = backuptext.length + SD_PDF_TEXT_START.length + SD_PDF_TEXT_END.length;

    var len_1 = SD_PDF_HEAD.length,
        len_2 = SD_PDF_1_0.length,
        len_3 = SD_PDF_2_0.length,
        len_4 = SD_PDF_3_0.length,
        len_xref = 0;
    
    var text = '';
    var buffer;
    
    buffer = SD_PDF_4_0_HEAD.format(stream_len);
    
    text += SD_PDF_HEAD;
    text += SD_PDF_1_0;
    text += SD_PDF_2_0;
    text += SD_PDF_3_0;
    text += buffer;
    text += SD_PDF_TEXT_START;
    text += backuptext;
    text += SD_PDF_TEXT_END;
    text += SD_PDF_4_0_END;
    
    len_xref += buffer.length + SD_PDF_TEXT_START.length;
    len_xref += backuptext.length;
    len_xref += SD_PDF_TEXT_END.length;
    len_xref += SD_PDF_4_0_END.length;
    
    text += SD_PDF_END.format(
                pre_pad_10(len_1), 
                pre_pad_10(len_1 + len_2),
                pre_pad_10(len_1 + len_2 + len_3),
                pre_pad_10(len_1 + len_2 + len_3 + len_4),
                len_1 + len_2 + len_3 + len_4 + len_xref
             );
    
    var a = document.createElement('a');
    a.href = makeTextFile(text);
    a.download = name + '.pdf';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
}


function backup_create()
{
    clear_notice(ui.backupXpriv);
    ui.backupXpriv.value = '';
    ui.backupElectrumBtcLegacy.value = '';
    ui.backupElectrumBtcSegwit.value = '';
    ui.backupElectrumBtcNativeSegwit.value = '';
    ui.backupElectrumBtcMultisig.value = '';
    ui.backupElectrumLtcLegacy.value = '';
    ui.backupElectrumLtcSegwit.value = '';
    ui.backupElectrumLtcNativeSegwit.value = '';
    ui.backupEthereumPrivateKeys.value = '';
    
    if (ui.backupUserEntropy.value === '') {
        ui.backupUserEntropy.focus();
        ui.backupUserEntropy.style.backgroundColor = "#fcc";
        return;
    }

    if (ui.backupUserEntropy.value.length < 32) {
        ui.backupUserEntropy.focus();
        ui.backupEntropy.style.backgroundColor = "#fcc";
        ui.backupEntropy.value = err_user_len;
        return;
    }

    if (ui.backupUserEntropy.value === err_user_len || ui.backupUserEntropy.value === err_user_cpy) {
        ui.backupUserEntropy.focus();      
        ui.backupEntropy.style.backgroundColor = "#fcc";
        ui.backupEntropy.value = err_user_cpy;
        return;
    }
    
    clear_notice(ui.backupUserEntropy);
   
    var hash = Crypto.createHash('sha256')
             .update(new Buffer(ui.backupUserEntropy.value, 'ascii'))
             .digest()
             .toString('hex');
    ui.backupEntropy.value = hash;
}



function backup_generate()
{
    ui.backupXpriv.value = '';;
    ui.backupElectrumBtcLegacy.value = '';;
    ui.backupElectrumBtcSegwit.value = '';;
    ui.backupElectrumBtcNativeSegwit.value = '';;
    ui.backupElectrumBtcMultisig.value = '';;
    ui.backupElectrumLtcLegacy.value = '';;
    ui.backupElectrumLtcSegwit.value = '';;
    ui.backupElectrumLtcNativeSegwit.value = '';;

    ui.backupEthereumPrivateKeys.value = '';;
    clear_notice(ui.backupUserEntropy);
    
    if (ui.backupEntropy.value === '') {
        ui.backupEntropy.focus();
        ui.backupEntropy.style.backgroundColor = "#fcc";
        return;
    }
    
    if (ui.backupEntropy.value.length != 64) {
        ui.backupEntropy.focus();
        ui.backupXpriv.style.backgroundColor = "#fcc";
        ui.backupXpriv.value = err_backup_len;
        return;
    }
    
    if (ui.backupPassword.value === '') {
        ui.backupPassword.focus();
        ui.backupPassword.style.backgroundColor = "#fcc";
        return;
    }
    
    if (ui.backupPassword.value.length < 4) {
        ui.backupPassword.focus();
        ui.backupXpriv.style.backgroundColor = "#fcc";
        ui.backupXpriv.value = err_pw_len;
        return;
    }
    
    clear_notice(ui.backupXpriv);
    clear_notice(ui.backupPassword);
    
    spinnerStart();
    setTimeout(function() {
        var curve_n = 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141';
        var zero    = '0000000000000000000000000000000000000000000000000000000000000000';
        
        var seed = new Buffer(ui.backupPassword.value, 'utf8');
            seed = Crypto.pbkdf2Sync(seed, PBKDF2_SALT, PBKDF2_ROUNDS_APP, PBKDF2_HMACLEN, 'sha512');
            seed = bip39.mnemonicToSeed(ui.backupEntropy.value, seed.toString('hex'));
        
        var hmac = Crypto.createHmac('sha512', 'Bitcoin seed')
                         .update(seed)
                         .digest('hex');

        var privatekey = hmac.slice(0, 64);
        var chaincode  = hmac.slice(64);

        if ((privatekey == zero) || (curve_n.toLowerCase() <= privatekey.toLowerCase())) {
            ui.backupEntropy.focus();
            ui.backupXpriv.style.backgroundColor = "#fcc";
            ui.backupXpriv.value = 'Invalid wallet. Your were <i>very</i> unlucky. Try a new input.';
            return;
        }


        //electrum uses different xpriv version bytes for p2wpkh-p2sh BIP49  and p2wpkh BIP84
        var xpriv = '0488ade4' + '000000000000000000' + chaincode + '00' + privatekey;
        xpriv = base58check.encode(new Buffer(xpriv, 'hex'));

        var bip32_keychain = new BIP32(xpriv);
        var electrum_key_btc_leg = bip32_keychain.derive("m/44'/0'/0'");
        electrum_key_btc_leg = base58check.encode(new Buffer(electrum_key_btc_leg.extended_private_key, 'hex'));

        var electrum_key_btc_ms = bip32_keychain.derive("m/100'/45'/0'");
        electrum_key_btc_ms = base58check.encode(new Buffer(electrum_key_btc_ms.extended_private_key, 'hex'));

        var electrum_key_ltc_leg = bip32_keychain.derive("m/44'/2'/0'");
        electrum_key_ltc_leg = base58check.encode(new Buffer(electrum_key_ltc_leg.extended_private_key, 'hex'));


        var segwit_xpriv = '049d7878' + '000000000000000000' + chaincode + '00' + privatekey;
        segwit_xpriv = base58check.encode(new Buffer(segwit_xpriv, 'hex'));

        var bip32_keychain_seg = new BIP32(segwit_xpriv);
        var electrum_key_btc_seg = bip32_keychain_seg.derive("m/49'/0'/0'");
        electrum_key_btc_seg = base58check.encode(new Buffer(electrum_key_btc_seg.extended_private_key, 'hex'));

        var electrum_key_ltc_seg = bip32_keychain_seg.derive("m/49'/2'/0'");
        electrum_key_ltc_seg = base58check.encode(new Buffer(electrum_key_ltc_seg.extended_private_key, 'hex'));


        var native_xpriv = '04b2430c' + '000000000000000000' + chaincode + '00' + privatekey;
        native_xpriv = base58check.encode(new Buffer(native_xpriv, 'hex'));

        var bip32_keychain_nat_seg = new BIP32(native_xpriv);
        var electrum_key_btc_nat_seg = bip32_keychain_nat_seg.derive("m/84'/0'/0'");
        electrum_key_btc_nat_seg = base58check.encode(new Buffer(electrum_key_btc_nat_seg.extended_private_key, 'hex'));

        var electrum_key_ltc_nat_seg = bip32_keychain_nat_seg.derive("m/84'/2'/0'");
        electrum_key_ltc_nat_seg = base58check.encode(new Buffer(electrum_key_ltc_nat_seg.extended_private_key, 'hex'));


        var ethereum_key, 
            ethereum_keys = '';
        for (var i = 0; i < 20; i++) {
            ethereum_key = bip32_keychain.derive("m/44'/60'/0'/0/" + i);
            ethereum_keys += toHexString(base58check.decode(ethereum_key.eckey.getExportedPrivateKey())).slice(2) + '\n';
        }

        ui.backupXpriv.value = xpriv;
        ui.backupElectrumBtcLegacy.value = electrum_key_btc_leg;
        ui.backupElectrumBtcSegwit.value = electrum_key_btc_seg;
        ui.backupElectrumBtcNativeSegwit.value = electrum_key_btc_nat_seg;
        ui.backupElectrumBtcMultisig.value = electrum_key_btc_ms;
        ui.backupElectrumLtcLegacy.value = electrum_key_ltc_leg;
        ui.backupElectrumLtcSegwit.value = electrum_key_ltc_seg;
        ui.backupElectrumLtcNativeSegwit.value = electrum_key_ltc_nat_seg;
        ui.backupEthereumPrivateKeys.value = ethereum_keys;

        spinnerStop();
    }, 100);
}

