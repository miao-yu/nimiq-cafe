const fsPromise = require('fs').promises;
const AddressBook = require('./address-book');

(async () => {
    const validatorsString = await fsPromise.readFile(__dirname + '/../json/validators.json', 'utf-8');
    const validators = JSON.parse(validatorsString);

    const validatorsMap = {};
    validators.forEach(validator => {
        validatorsMap[validator.address] = validator;
    });

    try {
        const combined = {};

        for (const key in AddressBook.BOOK) {
            combined[key] = {
                name: AddressBook.BOOK[key]
            };

            if (validatorsMap[key]) {
                combined[key]['name'] = validatorsMap[key].name;
                combined[key]['logo'] = validatorsMap[key].logo;
            }

            if (!combined[key]['logo'] && AddressBook.ICONS[key]) {
                combined[key]['logo'] = AddressBook.ICONS[key];
            }
        }

        // Save as JSON
        await fsPromise.writeFile(__dirname + '/../json/address-book.json', JSON.stringify(combined));
    } catch (parseError) {
        console.error('Error parsing the JavaScript file:', parseError);
    }
})();
