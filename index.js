const TelegramBot = require("node-telegram-bot-api");
const mysql = require("mysql");
const axios = require("axios");

const token = "7123071529:AAGBvP1TM7K0XR06O4wy3xdey319ooIN_-A";
const bot = new TelegramBot(token, { polling: true });

// Menghubungkan ke MySQL
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "user"
});

connection.connect(err => {
    if (err) {
        console.error("Koneksi database error:", err);
        return;
    }
});

bot.getChatMember(chatId, userId)
  .then(chatMember => {
    console.log(chatMember);
  })
  .catch(error => {
    console.error(error);
  });

// Fungsi untuk menampilkan pesan perkenalan bot saat pengguna pertama kali memulai
bot.onText(/\/start/, msg => {
    const chatId = msg.chat.id;

    const apiUrl = "https://api.waifu.im/search";
    const params = {
        included_tags: "oppai",
        width: ">=500"
    };

    const queryParams = new URLSearchParams();

    for (const key in params) {
        if (Array.isArray(params[key])) {
            params[key].forEach(value => {
                queryParams.append(key, value);
            });
        } else {
            queryParams.set(key, params[key]);
        }
    }

    const requestUrl = `${apiUrl}?${queryParams.toString()}`;

    axios
        .get(requestUrl)
        .then(response => {
            const data = response.data;
            if (data.images && data.images.length > 0) {
                const imageUrl = data.images[0].url;
                const caption = `Selamat datang di Bot Telegram kami!

Kami adalah bot yang siap membantu Anda dalam berbagai hal. Berikut adalah beberapa perintah jika anda butuh bantuan:

- /help: Menampilkan bantuan lengkap tentang cara menggunakan bot.

Selamat menggunakan bot kami! Jika Anda membutuhkan bantuan, jangan ragu untuk menghubungi kami di sini.
`;

                bot.sendPhoto(chatId, imageUrl, { caption: caption })
                    .then(() => {
                        return;
                    })
                    .catch(error => {
                        return;
                    });
            } else {
                return;
            }
        })
        .catch(error => {
            console.error("Error:", error.message);
        });
});

// Daftar pengaturan default
let settings = {
    language: "English",
    notifications: true
};

// Menambahkan perintah /settings untuk mengatur preferensi bot
bot.onText(/\/settings/, msg => {
    const chatId = msg.chat.id;

    // Menampilkan opsi pengaturan kepada pengguna
    const options = [
        "Language: " + settings.language,
        "Notifications: " + (settings.notifications ? "Enabled" : "Disabled")
    ];

    const message = "Bot Settings:\n\n" + options.join("\n");

    bot.sendMessage(chatId, message);
});

// Menambahkan perintah /setlanguage untuk mengatur bahasa
bot.onText(/\/setlanguage (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const language = match[1];

    settings.language = language;

    bot.sendMessage(chatId, "Language set to: " + language);
});

// Menambahkan perintah /togglenotifications untuk mengaktifkan/menonaktifkan notifikasi
bot.onText(/\/togglenotifications/, msg => {
    const chatId = msg.chat.id;

    settings.notifications = !settings.notifications;

    const status = settings.notifications ? "Enabled" : "Disabled";
    bot.sendMessage(chatId, "Notifications status: " + status);
});

// Fungsi untuk menangani registrasi pengguna
bot.onText(/\/register\b(.+)?/, (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    // Jika tidak ada parameter tambahan
    if (!match[1]) {
        bot.sendMessage(
            chatId,
            'Registrasi gagal. Silakan ketik "/register [Nama] [Email]" untuk mendaftar.'
        );
        return;
    }

    const [_, userData] = match;
    // Memisahkan nama dan email dari userData
    const [name, email] = userData.trim().split(" ");

    // Memastikan nama dan email tidak kosong
    if (!name || !email) {
        bot.sendMessage(
            chatId,
            'Registrasi gagal. Silakan ketik "/register [Nama] [Email]" untuk mendaftar.'
        );
        return;
    }

    // Mendapatkan waktu saat pendaftaran berhasil
    const date = new Date();
    const tanggal = date.getDate();
    const bulan = date.getMonth();
    const tahun = date.getFullYear();
    const jam = date.getHours();
    const menit = date.getMinutes();
    const detik = date.getSeconds();
    const millisecond = date.getMilliseconds();

    // Memeriksa apakah pengguna sudah terdaftar sebelumnya berdasarkan username
    const checkUserSql = `SELECT * FROM users WHERE username = ?`;
    const checkUserValues = [username];

    connection.query(checkUserSql, checkUserValues, (err, result) => {
        if (err) {
            console.log(err);
            bot.sendMessage(chatId, "Terjadi kesalahan. Coba lagi nanti.");
        } else {
            if (result.length > 0) {
                bot.sendMessage(chatId, "Anda sudah terdaftar.");
            } else {
                // Jika pengguna belum terdaftar, simpan data pengguna baru ke dalam database
                const insertUserSql = `INSERT INTO users (username, name, email) VALUES (?, ?, ?)`;
                const insertUserValues = [username, name, email];

                connection.query(
                    insertUserSql,
                    insertUserValues,
                    (err, result) => {
                        if (err) {
                            console.log(err);
                            bot.sendMessage(
                                chatId,
                                "Pendaftaran gagal. Coba lagi nanti."
                            );
                        } else {
                            const registrationDate = `${tanggal}-${bulan}-${tahun} ${jam}:${menit}:${detik}.${millisecond}`;
                            bot.sendMessage(
                                chatId,
                                `Pendaftaran berhasil pada ${registrationDate} Selamat datang, ${name}!`
                            );
                            console.log(`- > ${username} telah bergabung.`);
                        }
                    }
                );
            }
        }
    });
});

// Fungsi untuk menghapus data pengguna dari database
bot.onText(/\/del(?:\s+(.+))?/, (msg, match) => {
    const chatId = msg.chat.id;
    const deleteUsername = match[1];

    if (!deleteUsername) {
        bot.sendMessage(
            chatId,
            'Silakan ketik "/del [username]" untuk menghapus pengguna dari database.'
        );
        return;
    }

    // Cek apakah username yang dimasukkan ada di database
    const checkUserSql = `SELECT * FROM users WHERE username = ?`;
    const checkUserValues = [deleteUsername];

    connection.query(checkUserSql, checkUserValues, (err, result) => {
        if (err) {
            console.log(err);
            bot.sendMessage(chatId, "Terjadi kesalahan. Coba lagi nanti.");
        } else {
            if (result.length > 0) {
                // Jika username ada di database, hapus data pengguna tersebut
                const deleteUserSql = `DELETE FROM users WHERE username = ?`;
                const deleteUserValues = [deleteUsername];

                connection.query(
                    deleteUserSql,
                    deleteUserValues,
                    (err, result) => {
                        if (err) {
                            console.log(err);
                            bot.sendMessage(
                                chatId,
                                "Terjadi kesalahan. Coba lagi nanti."
                            );
                        } else {
                            bot.sendMessage(
                                chatId,
                                "Data pengguna berhasil dihapus."
                            );
                        }
                    }
                );
            } else {
                // Jika username tidak ada di database, beri petunjuk untuk memasukkan username dengan benar
                bot.sendMessage(
                    chatId,
                    'Username tidak ditemukan. Silakan masukkan username dengan benar menggunakan perintah "/del [username]".'
                );
            }
        }
    });
});

// Fungsi untuk menampilkan informasi pengguna terdaftar
bot.onText(/\/info/, msg => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;

    const sql = `SELECT * FROM users WHERE username = ?`;
    const values = [username];

    connection.query(sql, values, (err, result) => {
        if (err) {
            console.log(err);
            bot.sendMessage(chatId, "Terjadi kesalahan. Coba lagi nanti.");
        } else {
            if (result.length > 0) {
                const userInfo = `Informasi Anda:
Uid : ${userId}
Username: @${result[0].username}
Nama: ${result[0].name}
Email: ${result[0].email}`;
                bot.sendMessage(chatId, userInfo);
            } else {
                const infoMessage = `Anda belum terdaftar. Silakan daftar dengan menggunakan perintah /register [Nama] [Email].`;
                bot.sendMessage(chatId, infoMessage);
            }
        }
    });
});

// Fungsi untuk menampilkan pesan bantuan lengkap
bot.onText(/\/help/, msg => {
    const chatId = msg.chat.id;

    const helpMessage = `
Bantuan:
- /start: Menampilkan pesan perkenalan bot.
- /register [Nama] [Email]: Mendaftarkan diri ke dalam sistem.
- /info: Menampilkan informasi yang telah Anda daftarkan.
- /del [username]: Menghapus pengguna dari database.
- /help: Menampilkan bantuan ini.
- /settings: Lihat dan perbarui pengaturan bot.
- /setlanguage [bahasa]: Atur bahasa bot.
- /togglenotifications: Aktifkan atau nonaktifkan notifikasi

Jika Anda memerlukan bantuan lebih lanjut, jangan ragu untuk menghubungi kami di sini.
    `;

    bot.sendMessage(chatId, helpMessage);
});

console.clear();

console.log(`
-- ..####...##..##..##..##..##..##..........#####....####...######.
-- .##..##..##..##..###.##..##.##...........##..##..##..##....##...
-- .##......##..##..##.###..####............#####...##..##....##...
-- .##..##..##..##..##..##..##.##...........##..##..##..##....##...
-- ..####....####...##..##..##..##..........#####....####.....##...
-- ................................................................
          By padil\t\tVersion : U.217.aVc aplha
          Github: Kumis-XD\tWhatsapp: +62 858-6776-0406\n
- > API version: 0.65.1\n- > Link bot: https://t.me/cunks_bot`);

process.on("warning", warning => {
    if (warning.name === "DeprecationWarning" && warning.code === "DEP0040") {
        // abaikan peringatan punycode deprecated
        return;
    }
    console.warn(warning);
});

// Query untuk mengambil semua data pengguna dari tabel users
const sql = `SELECT * FROM users`;

connection.query(sql, (err, results) => {
    if (err) {
        console.error("Terjadi kesalahan saat mengambil data pengguna:", err);
    } else {
        if (results.length > 0) {
            let userList = "\t[ Pengguna Terdaftar: ]\n";
            results.forEach(user => {
                userList += `- > Username: @${user.username}\n`;
            });
            console.log(userList); // Menampilkan di CLI
        } else {
            console.log("Tidak ada pengguna terdaftar saat ini");
        }
    }
});

// Fungsi untuk menangani koneksi error atau time out
bot.on("polling_error", error => {
    console.error("Terjadi kesalahan koneksi:", error.code); // Menampilkan kode error
});
