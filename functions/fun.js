import fs from 'fs';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import { findPhoneNumbersInText } from 'libphonenumber-js'
import { HttpsProxyAgent } from 'https-proxy-agent'

async function savePageHtml(url) {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    // Set up the proxy agent
    const proxy = 'https://174.64.199.79:4145'; // Replace with your proxy URL
    const agent = new HttpsProxyAgent(proxy);

    try {
        const response = await fetch(url, {
            headers,
            // agent // uncomment this for proxy use
        });

        const html = await response.text();
        return html;
    } catch (error) {
        console.error('Error saving page HTML:', error);
        return null;
    }
}

function joinArrayOrVariable(arrayOrVariable) {
    if (Array.isArray(arrayOrVariable)) {
        return arrayOrVariable.join(" ");
    } else {
        return arrayOrVariable;
    }
}


function extractMobileNumbers(html) {
    const $ = cheerio.load(html);
    const mobileNumbers = [];

    // Remove <style> tags
    $('style').remove();

    // Remove <script> tags
    $('script').remove();

    $('div').each((index, element) => {
        const text = $(element).text();
        const mobileRegex = /\+\d{2}\s?\d{10}/g; // Regex to match country code (+91) followed by 10-digit mobile number
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
        const usernameRegex = /@(\w+)/g;

        console.log({ text })

        // const matches = text.match(mobileRegex);
        const findNum = findPhoneNumbersInText(text, 'US')
        const matches = findNum.map(i => i.number.number)

        const email = text.match(emailRegex);
        const username = text.match(usernameRegex);
        const name = text.match(/(^\[\w+)|(\w+ )+|<.+>/gi);


        // console.log({ matches })

        if (matches) {
            matches.forEach((match) => {
                mobileNumbers.push({ number: match, email: joinArrayOrVariable(email), username: joinArrayOrVariable(username), name: name[0], other: joinArrayOrVariable(name) });
                // // const number = match.replace(/\D/g, ''); // Remove non-digit characters
                // if (number.startsWith('91')) {
                //     mobileNumbers.push({ number: match, email: joinArrayOrVariable(email), username: joinArrayOrVariable(username), name: name[0], other: joinArrayOrVariable(name) });
                // }
            });
        }
    });

    return mobileNumbers;
}


const removeDuplicateObjects = (array) => {
    const uniqueArray = [];
    array.forEach((obj) => {
        if (uniqueArray.findIndex((item) => JSON.stringify(item) === JSON.stringify(obj)) === -1) {
            uniqueArray.push(obj);
        }
    });

    return uniqueArray;
};

async function getUniqueMobileNumbers(url) {
    try {
        const html = await savePageHtml(url);
        if (html) {
            const mobileNumbers = extractMobileNumbers(html);
            const uniqueArray = removeDuplicateObjects(mobileNumbers);
            return uniqueArray;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function generateGoogleSearchQuery(keyword, pageNumber) {
    const encodedKeyword = encodeURIComponent(keyword);
    const startIndex = (pageNumber - 1) * 10; // Assuming 10 results per page
    const query = `https://www.google.com/search?q=${encodedKeyword}&start=${startIndex}`;

    return query;
}

function generateSearchString(keyword, searchTerms) {
    const siteQuery = `site:${keyword}`;
    const termQueries = searchTerms.map(term => `"${term}"`);

    const searchString = `${siteQuery} ${termQueries.join(' ')}`;
    return searchString;
}

const grabData = (website, array, page) => {
    return new Promise(async (resolve, reject) => {
        try {
            const keyword = generateSearchString(website, array)

            console.log({ keyword })

            const searchQuery = generateGoogleSearchQuery(keyword, parseInt(page));

            console.log({ searchQuery: JSON.stringify(searchQuery) })

            const data = await getUniqueMobileNumbers(searchQuery)

            console.log({ data })
            resolve({ success: true, data })

        } catch (err) {
            console.log(err)
            resolve({ err, success: false })
        }
    })

}

export { grabData }