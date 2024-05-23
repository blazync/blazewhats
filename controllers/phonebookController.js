import query from '../database/dbpromise.js'
import csvtojson from 'csvtojson';
import ExcelJS from 'exceljs'

const addPhoneBook = async (req, res) => {
    try {

        // getting esisting one 
        const getone = await query(`SELECT * FROM phonebook WHERE name = ? and uid = ?`, [req.body.name, req.decode.uid])
        if (getone.length > 0) {
            return res.json({ msg: "Duplicate phonebook name found. please choose another name" })
        }

        const data = await query(`INSERT INTO phonebook (uid, name) VALUES (?,?)`, [
            req.decode.uid, req.body.name
        ])


        res.json({ data, success: true })

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}

function validateNumbers(numbers) {
    const regex = /^\d+$/;

    for (const number of numbers) {
        if (!regex.test(number)) {
            return false;
        }
    }

    return true;
}

function convertStringToArray(numbersString, prefixNumber = '') {
    const cleanedString = numbersString.replace(/\n+/g, '\n').trim(); // Remove extra newlines and trim
    const numbersArray = cleanedString.split('\n').map(number => (prefixNumber + number).trim());
    return numbersArray;
}


const addPhoneNumPaste = async (req, res) => {
    try {
        const numArr = convertStringToArray(req.body.pastedNum, req.body.prefixActive ? req.body.prefixCode : "")
        if (numArr.length < 1) {
            return res.json({ msg: "No numbers passed" })
        }

        const isValid = validateNumbers(numArr);

        if (!isValid) {
            return res.json({ msg: "Please pass numbers in correct format" })
        }

        const values = numArr.map((contacts) => [
            req.decode.uid,
            "NA",
            req.body.phonebookName,
            contacts
        ])


        await query(`INSERT INTO phonebook_contacts (uid, name, phonebook_name, mobile) VALUES ?`, [values])

        setTimeout(async () => {
            await query(`DELETE FROM phonebook_contacts WHERE mobile IS NULL`, [])


            // checking limit 
            const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
            const limit = user[0].contactlimit

            await query(`UPDATE user SET contactlimit = ? WHERE uid = ?`, [parseInt(limit) - numArr?.length, req.decode.uid])
        }, 3000);


        res.json({ msg: "Your contacts were imported", success: true })

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}

const getPhoneBook = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM phonebook WHERE uid = ?`, [req.decode.uid])
        res.json({ data, success: true })

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}

const deletePhoneBook = async (req, res) => {
    try {


        await query(`DELETE FROM phonebook WHERE id = ?`, [req.body.id])
        await query(`DELETE from phonebook_contacts WHERE phonebook_name = ?`, [[req.body.name]])
        res.json({ msg: "Phonebook was deleted", success: true })

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}

const addContact = async (req, res) => {
    try {
        // get ger 
        const user = await query(`SELECT * FROM user WHERE uid =?`, [req.decode.uid])
        const getAllContacts = await query(`SELECT * FROM phonebook_contacts WHERE uid =?`, [req.decode.uid])
        if (parseInt(user[0].contactlimit) >= getAllContacts.length) {
            await query(`INSERT INTO phonebook_contacts (uid, name, phonebook_name, mobile, var_one, var_two, var_three, var_four, var_five) VALUES (?,?,?,?,?,?,?,?,?) `, [
                req.decode.uid, req.body.name, req.body.phonebookName, req.body.mobile, req.body.var_one, req.body.var_two, req.body.var_three, req.body.var_four, req.body.var_five
            ])

            // descreasing limit 
            const finalAdd = user[0].contactlimit - 1
            await query(`UPDATE user SET contactlimit = ? WHERE uid = ?`, [finalAdd, req.decode.uid])


            res.json({ success: true, msg: "Contact was added" })
        } else {
            res.json({ success: false, msg: "You dont have contacts limit" })
        }

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}


const getContacts = async (req, res) => {
    try {
        const data = await query(`SELECT * FROM phonebook_contacts WHERE uid = ?`, [req.decode.uid])
        res.json({ data, success: true })

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}

const deleteContact = async (req, res) => {
    try {
        await query(`DELETE FROM phonebook_contacts WHERE id IN (?)`, [req.body.selected])
        res.json({ success: true, msg: "Contact(s) was deleted" })

    } catch (err) {
        res.json({ err, msg: "server error" })
        console.log(err)
    }
}


function validateArray(array) {
    for (let i = 0; i < array.length; i++) {
        const obj = array[i];
        if (!obj.hasOwnProperty("name") || !obj.hasOwnProperty("mobile")) {
            return false;
        }
    }
    return true;
}

function validateArrayNum(array) {
    console.log(JSON.stringify({ array }))
    const numberRegex = /^\d+(\.\d+)?$/;

    for (let i = 0; i < array.length; i++) {
        if (!numberRegex.test(array[i])) {
            return false; // Invalid array element found
        }
    }

    return true; // All array elements are valid numbers
}

const adCSV = async (req, res) => {
    try {

        const file = req.files.file;

        if (!file) {
            return res.json({ msg: "Please attach a csv file" })
        }

        const jsonArray = await csvtojson().fromString(file.data.toString());

        const check = validateArray(jsonArray)
        if (!check) {
            return res.json("You csv does not have name and email fields")
        }

        const arrNum = jsonArray.map((i) => i.mobile)

        if (!validateArrayNum(arrNum)) {
            return res.json({ msg: "You forget to format mobile number cell please format it to number" })
        }

        // checking limit 
        const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
        const limit = user[0].contactlimit

        if (parseInt(limit) < jsonArray?.length) {
            return res.json({ msg: `You have ${limit} left and you are trying to add ${jsonArray?.length} contacts` })
        }

        console.log(jsonArray)


        const values = jsonArray.map((num) => [
            req.decode.uid,
            num.name,
            req.body.phonebookName,
            num.mobile,
            num.var_one,
            num.var_two,
            num.var_three,
            num.var_four,
            num.var_five
        ])

        await query(`INSERT INTO phonebook_contacts (uid, name, phonebook_name, mobile, var_one, var_two, var_three, var_four, var_five) VALUES ?`, [values])

        setTimeout(async () => {
            await query(`DELETE FROM phonebook_contacts WHERE mobile IS NULL`, [])

            // checking limit 
            const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
            const limit = user[0].contactlimit

            await query(`UPDATE user SET contactlimit = ? WHERE uid = ?`, [parseInt(limit) - jsonArray?.length, req.decode.uid])
        }, 3000);

        res.json({ msg: "Your contacts were imported", success: true });
    } catch (err) {
        res.json({ err, msg: "server error" });
        console.log(err);
    }
};



const adExcel = async (req, res) => {
    try {
        const file = req.files.file;

        if (!file) {
            return res.json({ msg: "Please attach an Excel file" });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file.data);

        const worksheet = workbook.worksheets[0];
        const rows = worksheet.getSheetValues();


        // Remove empty rows from the rows array
        const filteredRows = rows.filter((row) => row.some((cell) => cell !== undefined && cell !== null));

        // Extract the field names from the first row
        const fieldNames = filteredRows[0];

        // Remove the first row (field names)
        const dataRows = filteredRows.slice(1);

        // Map each data row to an object with field names as keys
        const jsonArray = dataRows.map((row) => {
            const dataObject = {};
            fieldNames?.forEach((field, index) => {
                dataObject[field] = row[index];
            });
            return dataObject;
        });


        const check = validateArray(jsonArray);
        if (!check) {
            return res.json("Your Excel file does not have name and email fields");
        }

        const arrNum = jsonArray.map((i) => i.mobile);

        if (!validateArrayNum(arrNum)) {
            return res.json({
                msg: "You forgot to format the mobile number cell. Please format it as a number",
            });
        }

        // checking limit
        const user = await query("SELECT * FROM user WHERE uid = ?", [req.decode.uid]);
        const limit = user[0].contactlimit;

        if (parseInt(limit) < jsonArray?.length) {
            return res.json({
                msg: `You have ${limit} left and you are trying to add ${jsonArray?.length} contacts`,
            });
        }

        console.log(jsonArray);

        const values = jsonArray.map((num) => [
            req.decode.uid,
            num.name,
            req.body.phonebookName,
            num.mobile,
            num.var_one,
            num.var_two,
            num.var_three,
            num.var_four,
            num.var_five,
        ]);

        await query(
            `INSERT INTO phonebook_contacts (uid, name, phonebook_name, mobile, var_one, var_two, var_three, var_four, var_five) VALUES ?`,
            [values]
        );

        setTimeout(async () => {
            await query(`DELETE FROM phonebook_contacts WHERE mobile IS NULL`, []);

            // checking limit 
            const user = await query(`SELECT * FROM user WHERE uid = ?`, [req.decode.uid])
            const limit = user[0].contactlimit

            await query(
                `UPDATE user SET contactlimit = ? WHERE uid = ?`,
                [parseInt(limit) - jsonArray?.length, req.decode.uid]
            );
        }, 3000);

        res.json({ msg: "Your contacts were imported", success: true });
    } catch (err) {
        res.json({ err, msg: "Server error" });
        console.log(err);
    }
};


export { addPhoneBook, adExcel, getContacts, addPhoneNumPaste, adCSV, getPhoneBook, deleteContact, deletePhoneBook, addContact }
