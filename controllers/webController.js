import query from '../database/dbpromise.js'
import fs from 'fs'
import path from 'path'
import Importer from 'mysql-import'
import fetch from 'node-fetch'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises';
import extract from 'extract-zip'

// get all payment gateways 
const getAllPayments = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM payment_gateways WHERE active = ?`, [1])
        res.json({ data, success: true })

    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}

// get all payment gateways 
const getAllPaymentsAdmin = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM payment_gateways`, [])
        res.json({ data, success: true })

    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}

const getWebPublic = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM web`, [])
        res.json({ data: data[0], success: true })

    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}

const updatePayment = async (req, res) => {
    try {
        await query(`UPDATE payment_gateways SET active = ?, payment_id = ?, payment_keys = ? WHERE code = ? `, [
            req.body.active, req.body.payment_id, req.body.payment_keys, req.body.code
        ])
        res.json({ msg: "Method was updated", success: true })

    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}

const getOneLang = async (req, res) => {
    try {
        const cirDir = process.cwd()
        const code = req.query.code
        fs.readFile(`${cirDir}/languages/${code}.json`, "utf8", (err, lang) => {
            if (err) {
                console.log("File read failed:", err);
                res.json({ notfound: true })
                return;
            }
            res.json({
                success: true,
                data: JSON.parse(lang)
            })
        });

    } catch (err) {
        res.json({ err, msg: 'server error' })
        console.log(err)
    }
}

const getAllLangName = async (req, res) => {
    try {
        const cirDir = process.cwd()
        fs.readdir(`${cirDir}/languages/`, (err, files) => {
            res.json({ success: true, data: files })
        });
    } catch (err) {
        res.json({
            msg: "Server error",
            err: err
        })
        console.log(err)
    }
}


const updateLanguage = async (req, res) => {
    try {
        console.log("hit")
        const cirDir = process.cwd();
        const code = req.body.code;
        const updatedJson = req.body.updatedjson;

        const filePath = path.join(cirDir, "languages", `${code}.json`);

        fs.writeFile(filePath, JSON.stringify(updatedJson), "utf8", (err) => {
            if (err) {
                console.log("File write failed:", err);
                res.json({ success: false, error: err });
                return;
            }
            res.json({ success: true, msg: "Languages updated refresh the page to make effects" });
        });
    } catch (err) {
        res.json({ success: false, error: err, msg: "Server error" });
        console.log(err);
    }
};


const deleteLanguage = async (req, res) => {
    try {
        const cirDir = process.cwd();
        const code = req.body.code;

        const folderPath = path.join(cirDir, "languages");
        const filePath = path.join(folderPath, `${code}.json`);

        // Read the list of files in the "languages" folder
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                console.log("Error reading folder:", err);
                res.json({ success: false, error: err });
                return;
            }

            // Filter out non-JSON files
            const jsonFiles = files.filter((file) => file.endsWith(".json"));

            // Check if there is only one JSON file left
            if (jsonFiles.length === 1) {
                res.json({ success: false, msg: "You cannot delete all languages" });
                return;
            }

            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log("File deletion failed:", err);
                    res.json({ success: false, error: err });
                    return;
                }
                res.json({ success: true, msg: "Language file deleted successfully" });
            });
        });
    } catch (err) {
        res.json({ success: false, error: err, msg: "Server error" });
        console.log(err);
    }
};

const duplicateRandomLanguage = async (req, res) => {
    try {
        const cirDir = process.cwd();
        const newCode = req.body.newcode;

        const sourceFolderPath = path.join(cirDir, "languages");

        // Read the list of files in the "languages" folder
        fs.readdir(sourceFolderPath, (err, files) => {
            if (err) {
                console.log("Error reading folder:", err);
                res.json({ success: false, error: err });
                return;
            }

            // Filter out non-JSON files
            const jsonFiles = files.filter((file) => file.endsWith(".json"));

            // Select a random JSON file
            const randomIndex = Math.floor(Math.random() * jsonFiles.length);
            const randomFile = jsonFiles[randomIndex];

            const sourceFilePath = path.join(sourceFolderPath, randomFile);
            const destinationFilePath = path.join(sourceFolderPath, `${newCode}.json`);

            // Check if the destination file already exists
            if (fs.existsSync(destinationFilePath)) {
                res.json({ success: false, msg: "Destination file already exists" });
                return;
            }

            // Duplicate the source file to the destination file
            fs.copyFile(sourceFilePath, destinationFilePath, (err) => {
                if (err) {
                    console.log("File duplication failed:", err);
                    res.json({ success: false, error: err });
                    return;
                }
                res.json({ success: true, msg: "Language file duplicated successfully" });
            });
        });
    } catch (err) {
        res.json({ success: false, error: err, msg: "Server error" });
        console.log(err);
    }
};


const updateAppConfig = async (req, res) => {
    try {

        console.log(req.body.youtube_video)

        if (req.files) {
            if (req.files.file !== undefined) {
                const file = req.files.file
                const filename = ("" + Math.random()).substring(2, 7) + Date.now() + file.name
                const dirName = process.cwd()
                file.mv(`${dirName}/client/public/images/${filename}`, err => {
                    if (err) {
                        console.log(err)
                        return res.json({ err })
                    }
                })

                await query(`UPDATE web SET app_name = ?, youtube_video = ?, meta = ?, currency_symbol = ?, exchange_rate = ?, logo = ?,
                smtp_host = ?,smtp_port = ?,smtp_email = ?,smtp_pass = ?, is_custom_home = ?, custom_home_url = ? `, [
                    req.body.app_name, req.body.youtube_video, req.body.meta, req.body.currency_symbol, req.body.exchange_rate, filename,
                    req.body.smtp_host, req.body.smtp_port, req.body.smtp_email, req.body.smtp_pass, req.body.is_custom_home, req.body.custom_home_url
                ])
                res.json({ success: true, msg: "Settings was updated" })
            }

        } else {
            await query(`UPDATE web SET app_name = ?, youtube_video = ?, meta = ?, currency_symbol = ?, exchange_rate = ?,
            smtp_host = ?,smtp_port = ?,smtp_email = ?,smtp_pass = ?, is_custom_home = ?, custom_home_url = ?   `, [
                req.body.app_name, req.body.youtube_video, req.body.meta, req.body.currency_symbol, req.body.exchange_rate,
                req.body.smtp_host, req.body.smtp_port, req.body.smtp_email, req.body.smtp_pass, req.body.is_custom_home, req.body.custom_home_url
            ])
            res.json({ success: true, msg: "Settings was updated" })
        }




    } catch (err) {
        res.json({ success: false, error: err, msg: "Server error" });
        console.log(err);
    }
}


const installApp = async (req, res) => {
    try {
        const url = `https://verify-whatsham.oneoftheprojects.com/api/whatsham/download_whatsham?token=${req.body.token}`
        const downloadFile = async (url, path) => pipeline(
            (await fetch(url)).body,
            createWriteStream(path)
        );
        const dirName = process.cwd()

        await downloadFile(url, `${dirName}/client/public.zip`)

        await extract(`${dirName}/client/public.zip`, { dir: `${dirName}/client/public/` })
        fs.unlinkSync(`${dirName}/client/public.zip`);

        const importer = new Importer({
            host: process.env.DBHOST,
            user: process.env.DBUSER,
            password: process.env.DBPASS,
            database: process.env.DBNAME
        });

        await importer.import(`${dirName}/client/public/db/whatsham_install.sql`)

        res.json({
            success: true,
        })
    } catch (err) {
        console.log(err)
        res.json({
            success: false,
            err
        })
    }
}

const checkApp = async (req, res) => {
    try {
        function checkDir(path) {
            return new Promise((resolve) => {
                if (fs.existsSync(path)) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            })
        }

        const dirName = process.cwd()

        const checkDirr = await checkDir(`${dirName}/client/public`)

        res.status(200).json({
            install: true,
            install_status: checkDirr ? true : false
        })

    } catch (err) {
        console.log(err)
        res.json({ success: false, msg: "server error", err })
    }
}


export { getAllPayments, installApp, checkApp, updatePayment, updateAppConfig, deleteLanguage, duplicateRandomLanguage, updateLanguage, getAllLangName, getOneLang, getWebPublic, getAllPaymentsAdmin }
