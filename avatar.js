// Лицо игрока. По умолчанию — фото из Telegram: человек уже выбрал его там, спрашивать второй раз
// незачем. Своё фото из галереи перекрывает телеграмовское и живёт в сейве, а значит переезжает
// вместе с прогрессом на другое устройство.
//
// Сейв уходит на сервер целиком и ограничен 96 КБ, поэтому картинку ужимаем до квадрата 192×192
// и держим в пределах ~24 КБ: лицо в кружке 44 px этого более чем достаточно.
export const AVATAR_SIZE=192;
export const AVATAR_LIMIT=24*1024;
const DATA_URL=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const validAvatar=value=>typeof value==='string'&&value.length<=AVATAR_LIMIT*1.4&&DATA_URL.test(value);
// Что показывать: своё фото, иначе телеграмовское, иначе пусто — и тогда рисуется значок.
export const avatarSrc=(save,telegramPhoto=null)=>validAvatar(save?.avatar)?save.avatar:(typeof telegramPhoto==='string'&&/^https:\/\//.test(telegramPhoto)?telegramPhoto:null);

// Файл из галереи → квадратная картинка в data URL. Обрезаем по центру, а не сплющиваем:
// лицо не должно растягиваться.
export async function avatarFromFile(file,{size=AVATAR_SIZE,limit=AVATAR_LIMIT,scope=globalThis}={}){
 if(!file||!/^image\//.test(file.type||''))throw Error('Это не картинка');
 const bitmap=await scope.createImageBitmap(file);
 const canvas=scope.document.createElement('canvas');
 canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d');
 const side=Math.min(bitmap.width,bitmap.height);
 ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);
 bitmap.close?.();
 // Ужимаем до тех пор, пока не влезет в лимит сейва: качество падает раньше, чем картинка станет мылом.
 for(const quality of [.76,.62,.5,.4]){
  const data=canvas.toDataURL('image/jpeg',quality);
  if(data.length<=limit)return data;
 }
 throw Error('Фото слишком тяжёлое, возьми другое');
}
